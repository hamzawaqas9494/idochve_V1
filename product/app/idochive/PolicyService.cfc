component {

    public struct function active(required string code) {
        var q = queryExecute(
            "
                SELECT p.id AS policy_id, p.code, v.id AS version_id, v.body
                FROM prompt_policies p
                JOIN prompt_policy_versions v ON v.policy_id = p.id
                WHERE p.code = :code
                  AND v.is_active = true
                ORDER BY v.version_label DESC
                LIMIT 1
            ",
            { code: { value: arguments.code, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        if (q.recordCount == 0) {
            return { ok: false, policyId: "", versionId: "", code: arguments.code, body: "" };
        }
        return {
            ok: true,
            policyId: toString(q.policy_id[1]),
            versionId: toString(q.version_id[1]),
            code: toString(q.code[1]),
            body: toString(q.body[1])
        };
    }

    public array function listActive() {
        var q = queryExecute(
            "
                SELECT p.code, p.name, v.version_label, v.id AS version_id
                FROM prompt_policies p
                JOIN prompt_policy_versions v ON v.policy_id = p.id
                WHERE v.is_active = true
                ORDER BY p.code
            ",
            {},
            { datasource: "idochive" }
        );
        var rows = [];
        for (var row in q) {
            arrayAppend(rows, {
                "code": toString(row.code),
                "name": toString(row.name),
                "version": toString(row.version_label),
                "versionId": toString(row.version_id)
            });
        }
        return rows;
    }

    public void function enqueueForVersion(required string documentId, required string versionId) {
        queryExecute(
            "
                INSERT INTO classification_jobs (document_id, document_version_id, status)
                SELECT CAST(:documentId AS uuid), CAST(:versionId AS uuid), 'queued'
                WHERE NOT EXISTS (
                    SELECT 1 FROM classification_jobs j
                    WHERE j.document_version_id = CAST(:versionId AS uuid)
                      AND j.status IN ('queued', 'running')
                )
            ",
            {
                documentId: { value: arguments.documentId, cfsqltype: "cf_sql_varchar" },
                versionId: { value: arguments.versionId, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        queryExecute(
            "
                INSERT INTO extraction_jobs (document_id, document_version_id, status)
                SELECT CAST(:documentId AS uuid), CAST(:versionId AS uuid), 'queued'
                WHERE NOT EXISTS (
                    SELECT 1 FROM extraction_jobs j
                    WHERE j.document_version_id = CAST(:versionId AS uuid)
                      AND j.status IN ('queued', 'running')
                )
            ",
            {
                documentId: { value: arguments.documentId, cfsqltype: "cf_sql_varchar" },
                versionId: { value: arguments.versionId, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
    }

    public numeric function enqueueMissing() {
        var classed = queryExecute(
            "
                INSERT INTO classification_jobs (document_id, document_version_id, status)
                SELECT v.document_id, v.id, 'queued'
                FROM document_versions v
                JOIN document_chunks c ON c.document_version_id = v.id
                WHERE length(trim(c.content)) > 0
                  AND NOT EXISTS (
                      SELECT 1 FROM classification_jobs j
                      WHERE j.document_version_id = v.id
                        AND j.status IN ('queued', 'running', 'completed')
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM classification_results r
                      WHERE r.document_version_id = v.id
                  )
                LIMIT 10
                RETURNING id
            ",
            {},
            { datasource: "idochive" }
        );
        var extracted = queryExecute(
            "
                INSERT INTO extraction_jobs (document_id, document_version_id, status)
                SELECT v.document_id, v.id, 'queued'
                FROM document_versions v
                JOIN document_chunks c ON c.document_version_id = v.id
                WHERE length(trim(c.content)) > 0
                  AND NOT EXISTS (
                      SELECT 1 FROM extraction_jobs j
                      WHERE j.document_version_id = v.id
                        AND j.status IN ('queued', 'running', 'completed')
                  )
                  AND NOT EXISTS (
                      SELECT 1 FROM extraction_results r
                      WHERE r.document_version_id = v.id
                  )
                LIMIT 10
                RETURNING id
            ",
            {},
            { datasource: "idochive" }
        );
        return classed.recordCount + extracted.recordCount;
    }
}
