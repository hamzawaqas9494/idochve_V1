component {

    public struct function processNext() {
        new idochive.PolicyService().enqueueMissing();
        var claimed = claimJob();
        if (!claimed.ok) {
            return claimed;
        }
        try {
            var policy = new idochive.PolicyService().active("extract_fields");
            var text = loadChunkText(claimed.versionId);
            var payload = { "title": "", "language": "", "summary": "", "generateAvailable": false };
            if (len(trim(text)) && policy.ok) {
                var generated = new idochive.ModelGateway().generate(policy.body & chr(10) & chr(10) & left(text, 2000), 45);
                if (generated.ok) {
                    payload = parsePayload(generated.text);
                    payload["generateAvailable"] = true;
                }
            }
            var resultId = insertResult(claimed.documentId, claimed.versionId, policy.versionId, payload);
            completeJob(claimed.jobId);
            new idochive.AuditService().write("extraction.completed", "document", claimed.documentId, {
                jobId: claimed.jobId,
                resultId: resultId,
                policyVersionId: policy.versionId
            });
            return { "ok": true, "processed": true, "jobId": claimed.jobId, "resultId": resultId, "kind": "extraction" };
        } catch (any err) {
            failJob(claimed.jobId, err.message);
            return { "ok": false, "processed": true, "error": err.message, "jobId": claimed.jobId };
        }
    }

    private struct function claimJob() {
        var q = queryExecute(
            "
                UPDATE extraction_jobs
                SET status = 'running', started_at = now()
                WHERE id = (
                    SELECT j.id FROM extraction_jobs j
                    WHERE j.status = 'queued'
                      AND j.document_id NOT IN (
                          SELECT document_id FROM job_controls
                          WHERE command IN ('paused', 'cancelled', 'removed')
                      )
                    ORDER BY CASE WHEN EXISTS (
                        SELECT 1 FROM job_controls c
                        WHERE c.document_id = j.document_id AND c.run_next = true
                    ) THEN 0 ELSE 1 END, j.created_at ASC
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                )
                RETURNING id, document_id, document_version_id
            ",
            {},
            { datasource: "idochive" }
        );
        if (q.recordCount == 0) {
            return { "ok": false, "processed": false, "error": "No queued extraction jobs." };
        }
        return {
            ok: true,
            jobId: toString(q.id[1]),
            documentId: toString(q.document_id[1]),
            versionId: toString(q.document_version_id[1] ?: "")
        };
    }

    private string function loadChunkText(required string versionId) {
        if (!len(arguments.versionId)) {
            return "";
        }
        var q = queryExecute(
            "
                SELECT content FROM document_chunks
                WHERE document_version_id = CAST(:versionId AS uuid)
                ORDER BY chunk_index
                LIMIT 1
            ",
            { versionId: { value: arguments.versionId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        return q.recordCount ? toString(q.content[1]) : "";
    }

    private struct function parsePayload(required string raw) {
        var start = find("{", arguments.raw);
        var last = find("}", arguments.raw);
        var out = { "title": "", "language": "", "summary": "" };
        if (start && last GTE start) {
            try {
                var body = deserializeJSON(mid(arguments.raw, start, last - start + 1));
                if (structKeyExists(body, "title")) {
                    out["title"] = left(toString(body.title), 200);
                }
                if (structKeyExists(body, "language")) {
                    out["language"] = left(toString(body.language), 16);
                }
                if (structKeyExists(body, "summary")) {
                    out["summary"] = left(toString(body.summary), 500);
                }
            } catch (any ignore) {
            }
        }
        return out;
    }

    private string function insertResult(required string documentId, required string versionId, required string policyVersionId, required struct payload) {
        var q = queryExecute(
            "
                INSERT INTO extraction_results (
                    document_id, document_version_id, policy_version_id, payload, state
                ) VALUES (
                    CAST(:documentId AS uuid),
                    CAST(:versionId AS uuid),
                    CAST(:policyVersionId AS uuid),
                    CAST(:payload AS jsonb),
                    'pending_review'
                )
                RETURNING id
            ",
            {
                documentId: { value: arguments.documentId, cfsqltype: "cf_sql_varchar" },
                versionId: { value: arguments.versionId, cfsqltype: "cf_sql_varchar", null: !len(arguments.versionId) },
                policyVersionId: { value: arguments.policyVersionId, cfsqltype: "cf_sql_varchar", null: !len(arguments.policyVersionId) },
                payload: { value: serializeJSON(arguments.payload), cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        return toString(q.id[1]);
    }

    private void function completeJob(required string jobId) {
        queryExecute(
            "UPDATE extraction_jobs SET status = 'completed', finished_at = now(), error_text = NULL WHERE id = CAST(:jobId AS uuid)",
            { jobId: { value: arguments.jobId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
    }

    private void function failJob(required string jobId, required string errorText) {
        queryExecute(
            "UPDATE extraction_jobs SET status = 'failed', finished_at = now(), error_text = :errorText WHERE id = CAST(:jobId AS uuid)",
            {
                jobId: { value: arguments.jobId, cfsqltype: "cf_sql_varchar" },
                errorText: { value: left(arguments.errorText, 2000), cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
    }
}
