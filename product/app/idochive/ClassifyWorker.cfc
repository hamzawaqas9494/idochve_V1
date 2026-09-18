component {

    public struct function processNext() {
        new idochive.PolicyService().enqueueMissing();
        var claimed = claimJob();
        if (!claimed.ok) {
            return claimed;
        }
        try {
            var policy = new idochive.PolicyService().active("classify_document");
            var text = loadChunkText(claimed.versionId);
            var proposed = "";
            if (len(trim(text)) && policy.ok) {
                var generated = new idochive.ModelGateway().generate(policy.body & chr(10) & chr(10) & left(text, 2000), 45);
                if (generated.ok) {
                    proposed = parseCode(generated.text);
                }
            }
            var resultId = insertResult(claimed.documentId, claimed.versionId, policy.versionId, proposed);
            completeJob(claimed.jobId);
            new idochive.AuditService().write("classification.completed", "document", claimed.documentId, {
                jobId: claimed.jobId,
                resultId: resultId,
                policyVersionId: policy.versionId,
                proposedCode: proposed
            });
            return { "ok": true, "processed": true, "jobId": claimed.jobId, "resultId": resultId, "kind": "classification" };
        } catch (any err) {
            failJob(claimed.jobId, err.message);
            return { "ok": false, "processed": true, "error": err.message, "jobId": claimed.jobId };
        }
    }

    private struct function claimJob() {
        var q = queryExecute(
            "
                UPDATE classification_jobs
                SET status = 'running', started_at = now()
                WHERE id = (
                    SELECT j.id FROM classification_jobs j
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
            return { "ok": false, "processed": false, "error": "No queued classification jobs." };
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

    private string function parseCode(required string raw) {
        var start = find("{", arguments.raw);
        var last = find("}", arguments.raw);
        if (start && last GTE start) {
            try {
                var body = deserializeJSON(mid(arguments.raw, start, last - start + 1));
                var code = structKeyExists(body, "code") ? lCase(trim(toString(body.code))) : "";
                if (listFindNoCase("government_circular,contract,project_report,variation_order", code)) {
                    return code;
                }
            } catch (any ignore) {
            }
        }
        return "";
    }

    private string function insertResult(required string documentId, required string versionId, required string policyVersionId, required string proposed) {
        var q = queryExecute(
            "
                INSERT INTO classification_results (
                    document_id, document_version_id, policy_version_id, proposed_code, state
                ) VALUES (
                    CAST(:documentId AS uuid),
                    CAST(:versionId AS uuid),
                    CAST(:policyVersionId AS uuid),
                    :proposed,
                    'pending_review'
                )
                RETURNING id
            ",
            {
                documentId: { value: arguments.documentId, cfsqltype: "cf_sql_varchar" },
                versionId: { value: arguments.versionId, cfsqltype: "cf_sql_varchar", null: !len(arguments.versionId) },
                policyVersionId: { value: arguments.policyVersionId, cfsqltype: "cf_sql_varchar", null: !len(arguments.policyVersionId) },
                proposed: { value: arguments.proposed, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        return toString(q.id[1]);
    }

    private void function completeJob(required string jobId) {
        queryExecute(
            "UPDATE classification_jobs SET status = 'completed', finished_at = now(), error_text = NULL WHERE id = CAST(:jobId AS uuid)",
            { jobId: { value: arguments.jobId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
    }

    private void function failJob(required string jobId, required string errorText) {
        queryExecute(
            "UPDATE classification_jobs SET status = 'failed', finished_at = now(), error_text = :errorText WHERE id = CAST(:jobId AS uuid)",
            {
                jobId: { value: arguments.jobId, cfsqltype: "cf_sql_varchar" },
                errorText: { value: left(arguments.errorText, 2000), cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
    }
}
