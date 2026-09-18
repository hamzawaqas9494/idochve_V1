component {

    public struct function processNext() {
        var embeds = new idochive.EmbedService();
        embeds.enqueueMissing();
        var claimed = claimJob();
        if (!claimed.ok) {
            return claimed;
        }
        var gateway = new idochive.ModelGateway();
        try {
            var chunk = loadChunk(claimed.chunkId);
            if (!len(trim(chunk.content))) {
                completeJob(claimed.jobId);
                return { "ok": true, "processed": true, "jobId": claimed.jobId, "skipped": true };
            }
            var result = gateway.embed(chunk.content);
            if (!result.ok) {
                failJob(claimed.jobId, result.error);
                new idochive.AuditService().write("embedding.failed", "document", claimed.documentId, {
                    jobId: claimed.jobId,
                    modelVersionId: embeds.currentModelVersionId()
                });
                return { "ok": false, "processed": true, "error": result.error, "jobId": claimed.jobId };
            }
            writeVector(claimed.chunkId, embeds.currentModelVersionId(), gateway.vectorLiteral(result.vector));
            completeJob(claimed.jobId);
            new idochive.AuditService().write("embedding.completed", "document", claimed.documentId, {
                jobId: claimed.jobId,
                chunkId: claimed.chunkId,
                modelVersionId: embeds.currentModelVersionId(),
                dimension: 768
            });
            return {
                "ok": true,
                "processed": true,
                "jobId": claimed.jobId,
                "chunkId": claimed.chunkId,
                "dimension": 768
            };
        } catch (any err) {
            failJob(claimed.jobId, err.message);
            new idochive.AuditService().write("embedding.failed", "document", claimed.documentId, {
                jobId: claimed.jobId,
                error: left(err.message, 240)
            });
            return { "ok": false, "processed": true, "error": err.message, "jobId": claimed.jobId };
        }
    }

    private struct function claimJob() {
        var q = queryExecute(
            "
                UPDATE embed_jobs
                SET status = 'running', started_at = now()
                WHERE id = (
                    SELECT j.id
                    FROM embed_jobs j
                    WHERE j.status = 'queued'
                      AND (
                          j.document_id IS NULL
                          OR j.document_id NOT IN (
                              SELECT document_id FROM job_controls
                              WHERE command IN ('paused', 'cancelled', 'removed')
                          )
                      )
                    ORDER BY CASE WHEN EXISTS (
                        SELECT 1 FROM job_controls c
                        WHERE c.document_id = j.document_id AND c.run_next = true
                    ) THEN 0 ELSE 1 END, j.created_at ASC
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                )
                RETURNING id, chunk_id, document_id
            ",
            {},
            { datasource: "idochive" }
        );
        if (q.recordCount == 0) {
            return { "ok": false, "processed": false, "error": "No queued embedding jobs." };
        }
        return {
            ok: true,
            jobId: toString(q.id[1]),
            chunkId: toString(q.chunk_id[1]),
            documentId: toString(q.document_id[1] ?: "")
        };
    }

    private struct function loadChunk(required string chunkId) {
        var q = queryExecute(
            "
                SELECT content
                FROM document_chunks
                WHERE id = CAST(:chunkId AS uuid)
            ",
            { chunkId: { value: arguments.chunkId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        if (q.recordCount == 0) {
            throw(type="Embed.ChunkMissing", message="Chunk was not found.");
        }
        return { content: toString(q.content[1]) };
    }

    private void function writeVector(required string chunkId, required string modelVersionId, required string literal) {
        queryExecute(
            "
                INSERT INTO chunk_embeddings (chunk_id, model_version_id, embedding)
                VALUES (
                    CAST(:chunkId AS uuid),
                    CAST(:modelVersionId AS uuid),
                    CAST(:literal AS vector)
                )
                ON CONFLICT (chunk_id, model_version_id) DO NOTHING
            ",
            {
                chunkId: { value: arguments.chunkId, cfsqltype: "cf_sql_varchar" },
                modelVersionId: { value: arguments.modelVersionId, cfsqltype: "cf_sql_varchar" },
                literal: { value: arguments.literal, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
    }

    private void function completeJob(required string jobId) {
        queryExecute(
            "
                UPDATE embed_jobs
                SET status = 'completed', finished_at = now(), error_text = NULL
                WHERE id = CAST(:jobId AS uuid)
            ",
            { jobId: { value: arguments.jobId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
    }

    private void function failJob(required string jobId, required string errorText) {
        queryExecute(
            "
                UPDATE embed_jobs
                SET status = 'failed', finished_at = now(), error_text = :errorText
                WHERE id = CAST(:jobId AS uuid)
            ",
            {
                jobId: { value: arguments.jobId, cfsqltype: "cf_sql_varchar" },
                errorText: { value: left(arguments.errorText, 2000), cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
    }
}
