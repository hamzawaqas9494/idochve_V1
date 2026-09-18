component {

    public struct function list() {
        var jobs = queryExecute(
            "
                SELECT id, kind, status, archive_dir, document_count, version_count, blob_count, started_at, finished_at
                FROM backup_jobs
                ORDER BY started_at DESC
                LIMIT 20
            ",
            {},
            { datasource: "idochive" }
        );
        var live = queryExecute(
            "
                SELECT
                    (SELECT count(*) FROM documents) AS document_count,
                    (SELECT count(*) FROM document_versions) AS version_count
            ",
            {},
            { datasource: "idochive" }
        );
        var blobDir = getDirectoryFromPath(expandPath("/Application.cfc")) & "storage/blobs";
        var blobCount = 0;
        if (directoryExists(blobDir)) {
            blobCount = arrayLen(directoryList(blobDir, false, "name", "*.bin"));
        }

        var rows = [];
        for (var row in jobs) {
            arrayAppend(rows, {
                "id": toString(row.id),
                "kind": toString(row.kind),
                "status": toString(row.status),
                "archiveDir": toString(row.archive_dir),
                "documentCount": row.document_count,
                "versionCount": row.version_count,
                "blobCount": row.blob_count,
                "startedAt": toString(row.started_at),
                "finishedAt": toString(row.finished_at ?: "")
            });
        }
        return {
            "jobs": rows,
            "live": {
                "documentCount": live.document_count,
                "versionCount": live.version_count,
                "blobCount": blobCount
            }
        };
    }
}
