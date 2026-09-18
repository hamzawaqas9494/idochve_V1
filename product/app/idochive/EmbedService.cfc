component {

    public string function currentModelVersionId() {
        return "55555555-5555-5555-5555-555555555555";
    }

    public void function enqueueForVersion(required string versionId) {
        var q = queryExecute(
            "
                SELECT c.id AS chunk_id, v.document_id
                FROM document_chunks c
                JOIN document_versions v ON v.id = c.document_version_id
                WHERE v.id = CAST(:versionId AS uuid)
                  AND length(trim(c.content)) > 0
            ",
            { versionId: { value: arguments.versionId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        for (var row in q) {
            enqueueForChunk(toString(row.chunk_id), toString(row.document_id));
        }
    }

    public void function enqueueForChunk(required string chunkId, string documentId = "") {
        queryExecute(
            "
                INSERT INTO embed_jobs (chunk_id, document_id, status)
                SELECT CAST(:chunkId AS uuid), CAST(:documentId AS uuid), 'queued'
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM embed_jobs j
                    WHERE j.chunk_id = CAST(:chunkId AS uuid)
                      AND j.status IN ('queued', 'running')
                )
                  AND NOT EXISTS (
                    SELECT 1
                    FROM chunk_embeddings e
                    WHERE e.chunk_id = CAST(:chunkId AS uuid)
                      AND e.model_version_id = CAST(:modelVersionId AS uuid)
                )
            ",
            {
                chunkId: { value: arguments.chunkId, cfsqltype: "cf_sql_varchar" },
                documentId: { value: arguments.documentId, cfsqltype: "cf_sql_varchar", null: !len(arguments.documentId) },
                modelVersionId: { value: currentModelVersionId(), cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
    }

    public numeric function enqueueMissing() {
        var q = queryExecute(
            "
                INSERT INTO embed_jobs (chunk_id, document_id, status)
                SELECT c.id, v.document_id, 'queued'
                FROM document_chunks c
                JOIN document_versions v ON v.id = c.document_version_id
                WHERE length(trim(c.content)) > 0
                  AND NOT EXISTS (
                      SELECT 1
                      FROM chunk_embeddings e
                      WHERE e.chunk_id = c.id
                        AND e.model_version_id = CAST(:modelVersionId AS uuid)
                  )
                  AND NOT EXISTS (
                      SELECT 1
                      FROM embed_jobs j
                      WHERE j.chunk_id = c.id
                        AND j.status IN ('queued', 'running')
                  )
                LIMIT 20
                RETURNING id
            ",
            { modelVersionId: { value: currentModelVersionId(), cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        return q.recordCount;
    }
}
