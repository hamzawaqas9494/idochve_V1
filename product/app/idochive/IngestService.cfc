component {

    public void function enqueue(required string documentId, required string versionId) {
        var q = queryExecute(
            "
                INSERT INTO ingest_jobs (document_id, document_version_id, status)
                VALUES (CAST(:documentId AS uuid), CAST(:versionId AS uuid), 'queued')
                RETURNING id
            ",
            {
                documentId: { value: arguments.documentId, cfsqltype: "cf_sql_varchar" },
                versionId: { value: arguments.versionId, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        try {
            new idochive.JobQueue().enqueue("ocr", arguments.documentId, arguments.versionId, toString(q.id[1]), false);
        } catch (any err) {
            // Redis is optional until the worker is healthy.
        }
        new idochive.AuditService().write("ingestion.queued", "document", arguments.documentId, {
            versionId: arguments.versionId
        });
    }

    public string function decryptToTemp(required string blobKey, required string mimeType) {
        return new idochive.BlobStore().decryptToTemp(arguments.blobKey, arguments.mimeType);
    }

    public void function deleteTemp(required string path) {
        new idochive.BlobStore().deleteTemp(arguments.path);
    }
}
