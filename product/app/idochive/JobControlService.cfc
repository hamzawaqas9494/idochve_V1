component {

    public struct function apply(required string documentId, required string action) {
        if (!new idochive.JobService().canTick()) {
            return { ok: false, notFound: true, error: "Document was not found." };
        }
        var snapshot = loadAuthorized(arguments.documentId);
        if (!snapshot.ok) {
            return snapshot;
        }
        var verb = lCase(trim(arguments.action));
        if (!listFindNoCase("pause,start,cancel,remove", verb)) {
            return { ok: false, error: "That action is not supported." };
        }
        if (verb == "pause") {
            if (snapshot.ingestStatus != "queued" && snapshot.ingestStatus != "running") {
                return { ok: false, error: "Pause is available only while the job is queued or OCR is reading pages." };
            }
            upsert(snapshot, "paused", false);
            dropRedis(snapshot.documentId);
            new idochive.AuditService().write("job.paused", "document", snapshot.documentId, {
                documentId: snapshot.documentId
            });
            return { "ok": true, "action": "pause", "documentId": snapshot.documentId };
        }
        if (verb == "start") {
            if (snapshot.command == "removed") {
                return { ok: false, error: "A removed job cannot be started." };
            }
            if (snapshot.ingestStatus != "queued" && snapshot.command != "paused") {
                return { ok: false, error: "Start is available for queued or paused jobs." };
            }
            upsert(snapshot, "active", true);
            var queue = new idochive.JobQueue();
            if (queue.available()) {
                queue.enqueue("ocr", snapshot.documentId, snapshot.versionId, snapshot.ingestJobId, true);
                new idochive.AuditService().write("job.started", "document", snapshot.documentId, {
                    documentId: snapshot.documentId
                });
                return { "ok": true, "action": "start", "documentId": snapshot.documentId, "queued": true };
            }
            var processed = new idochive.OcrWorker().processDocument(snapshot.documentId);
            clearRunNext(snapshot.documentId);
            new idochive.AuditService().write("job.started", "document", snapshot.documentId, {
                documentId: snapshot.documentId
            });
            return {
                "ok": processed.ok ?: true,
                "action": "start",
                "documentId": snapshot.documentId,
                "processed": processed.processed ?: false,
                "error": processed.error ?: ""
            };
        }
        if (verb == "cancel") {
            if (!listFindNoCase("queued,running,failed", snapshot.ingestStatus) && snapshot.command != "paused") {
                return { ok: false, error: "End is available for queued, paused, running, or failed jobs." };
            }
            upsert(snapshot, "cancelled", false);
            dropRedis(snapshot.documentId);
            new idochive.AuditService().write("job.cancelled", "document", snapshot.documentId, {
                documentId: snapshot.documentId
            });
            return { "ok": true, "action": "cancel", "documentId": snapshot.documentId };
        }
        if (snapshot.ocrStatus == "needs_validation" || snapshot.workflowState == "approved" || snapshot.ready) {
            return { ok: false, error: "Ready and validation jobs cannot be removed." };
        }
        if (!listFindNoCase("queued,failed", snapshot.ingestStatus) && !listFindNoCase("paused,cancelled", snapshot.command)) {
            return { ok: false, error: "Remove is available for queued, paused, failed, or cancelled jobs." };
        }
        upsert(snapshot, "removed", false);
        dropRedis(snapshot.documentId);
        new idochive.AuditService().write("job.removed", "document", snapshot.documentId, {
            documentId: snapshot.documentId
        });
        return { "ok": true, "action": "remove", "documentId": snapshot.documentId };
    }

    private struct function loadAuthorized(required string documentId) {
        var id = trim(arguments.documentId);
        if (!len(id)) {
            return { ok: false, notFound: true, error: "Document was not found." };
        }
        var q = queryExecute(
            "
                WITH latest_version AS (
                    SELECT DISTINCT ON (v.document_id)
                           v.id, v.document_id
                    FROM document_versions v
                    WHERE v.document_id = CAST(:documentId AS uuid)
                    ORDER BY v.document_id, v.version_number DESC
                )
                SELECT d.id, d.organization_id, d.department_id,
                       lv.id AS version_id,
                       ij.id AS ingest_job_id, ij.status AS ingest_status,
                       o.status AS ocr_status,
                       c.command,
                       (
                           SELECT t.state FROM workflow_tasks t
                           WHERE t.document_id = d.id
                           ORDER BY t.created_at DESC
                           LIMIT 1
                       ) AS workflow_state
                FROM documents d
                JOIN latest_version lv ON lv.document_id = d.id
                LEFT JOIN LATERAL (
                    SELECT j.id, j.status
                    FROM ingest_jobs j
                    WHERE j.document_version_id = lv.id
                    ORDER BY j.created_at DESC
                    LIMIT 1
                ) ij ON true
                LEFT JOIN LATERAL (
                    SELECT r.status
                    FROM ocr_results r
                    WHERE r.document_version_id = lv.id
                    ORDER BY r.created_at DESC
                    LIMIT 1
                ) o ON true
                LEFT JOIN job_controls c ON c.document_id = d.id
                WHERE d.id = CAST(:documentId AS uuid)
            ",
            { documentId: { value: id, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        if (q.recordCount == 0) {
            return { ok: false, notFound: true, error: "Document was not found." };
        }
        if (!new idochive.DocumentService().canAccess(toString(q.organization_id[1]), toString(q.department_id[1] ?: ""))) {
            return { ok: false, notFound: true, error: "Document was not found." };
        }
        var workflow = lCase(toString(q.workflow_state[1] ?: ""));
        var ocr = lCase(toString(q.ocr_status[1] ?: ""));
        return {
            ok: true,
            documentId: toString(q.id[1]),
            versionId: toString(q.version_id[1] ?: ""),
            ingestJobId: toString(q.ingest_job_id[1] ?: ""),
            ingestStatus: lCase(toString(q.ingest_status[1] ?: "")),
            ocrStatus: ocr,
            command: lCase(toString(q.command[1] ?: "active")),
            workflowState: workflow,
            ready: workflow == "approved"
        };
    }

    private void function upsert(required struct snapshot, required string command, required boolean runNext) {
        queryExecute(
            "
                INSERT INTO job_controls (document_id, ingest_job_id, command, run_next, updated_by, updated_at)
                VALUES (
                    CAST(:documentId AS uuid),
                    CAST(:ingestJobId AS uuid),
                    :command,
                    :runNext,
                    CAST(:userId AS uuid),
                    now()
                )
                ON CONFLICT (document_id) DO UPDATE
                SET ingest_job_id = EXCLUDED.ingest_job_id,
                    command = EXCLUDED.command,
                    run_next = EXCLUDED.run_next,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = now()
            ",
            {
                documentId: { value: arguments.snapshot.documentId, cfsqltype: "cf_sql_varchar" },
                ingestJobId: { value: arguments.snapshot.ingestJobId, cfsqltype: "cf_sql_varchar", null: !len(arguments.snapshot.ingestJobId) },
                command: { value: arguments.command, cfsqltype: "cf_sql_varchar" },
                runNext: { value: arguments.runNext, cfsqltype: "cf_sql_bit" },
                userId: { value: session.userId, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
    }

    private void function clearRunNext(required string documentId) {
        queryExecute(
            "UPDATE job_controls SET run_next = false WHERE document_id = CAST(:documentId AS uuid)",
            { documentId: { value: arguments.documentId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
    }

    private void function dropRedis(required string documentId) {
        try {
            new idochive.JobQueue().removeForDocument(arguments.documentId);
        } catch (any err) {
            // Redis is optional in Unit 15.
            return;
        }
    }
}
