component {

    public struct function start(required struct input) {
        var filename = trim(arguments.input.filename ?: "");
        var mimeType = normalizeMime(arguments.input.mimeType ?: "", filename);
        var byteSize = val(arguments.input.byteSize ?: 0);
        var chunkSize = val(arguments.input.chunkSize ?: 262144);
        if (!len(filename) || len(filename) GT 200) {
            return { ok: false, error: "A file name is required." };
        }
        if (!isAllowedMime(mimeType)) {
            return { ok: false, error: "Only scanned PDFs and images can be uploaded." };
        }
        if (byteSize LT 1 || byteSize GT 104857600) {
            return { ok: false, error: "The file size is outside the allowed range." };
        }
        if (chunkSize LT 32 || chunkSize GT 1048576) {
            return { ok: false, error: "Chunk size is outside the allowed range." };
        }
        var chunkCount = int((byteSize + chunkSize - 1) / chunkSize);
        var q = queryExecute(
            "
                INSERT INTO upload_sessions (
                    organization_id, department_id, user_id, filename, mime_type,
                    byte_size, chunk_size, chunk_count, class_code, language_code, status
                ) VALUES (
                    CAST(:orgId AS uuid), CAST(:deptId AS uuid), CAST(:userId AS uuid),
                    :filename, :mimeType, :byteSize, :chunkSize, :chunkCount,
                    :classCode, :lang, 'open'
                )
                RETURNING id
            ",
            {
                orgId: { value: session.organizationId, cfsqltype: "cf_sql_varchar" },
                deptId: { value: session.departmentId, cfsqltype: "cf_sql_varchar", null: !len(session.departmentId ?: "") },
                userId: { value: session.userId, cfsqltype: "cf_sql_varchar" },
                filename: { value: filename, cfsqltype: "cf_sql_varchar" },
                mimeType: { value: mimeType, cfsqltype: "cf_sql_varchar" },
                byteSize: { value: byteSize, cfsqltype: "cf_sql_bigint" },
                chunkSize: { value: chunkSize, cfsqltype: "cf_sql_integer" },
                chunkCount: { value: chunkCount, cfsqltype: "cf_sql_integer" },
                classCode: { value: arguments.input.classCode ?: "project_report", cfsqltype: "cf_sql_varchar" },
                lang: { value: arguments.input.languageCode ?: "en", cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        directoryCreate(sessionDir(toString(q.id[1])), true);
        new idochive.AuditService().write("upload.started", "upload", toString(q.id[1]), {
            filename: filename,
            byteSize: byteSize
        });
        return { ok: true, session: describe(toString(q.id[1])) };
    }

    public struct function status(required string uploadId) {
        var loaded = loadOwned(arguments.uploadId);
        if (!loaded.ok) {
            return loaded;
        }
        return { ok: true, session: describe(loaded.id) };
    }

    public struct function writeChunk(required string uploadId, required numeric index, required string filePath) {
        var loaded = loadOwned(arguments.uploadId);
        if (!loaded.ok) {
            return loaded;
        }
        if (loaded.status != "open") {
            return { ok: false, error: "This upload can no longer receive chunks." };
        }
        var idx = int(arguments.index);
        if (idx LT 0 || idx GTE loaded.chunkCount) {
            return { ok: false, error: "That chunk index is not in this upload." };
        }
        if (!len(arguments.filePath) || !fileExists(arguments.filePath)) {
            return { ok: false, error: "A chunk file is required." };
        }
        var expected = (idx EQ loaded.chunkCount - 1)
            ? (loaded.byteSize - (loaded.chunkCount - 1) * loaded.chunkSize)
            : loaded.chunkSize;
        var actual = fileInfo(arguments.filePath).size;
        if (actual != expected) {
            return { ok: false, error: "Chunk length did not match the declared size." };
        }
        var dest = sessionDir(loaded.id) & "/" & idx & ".part";
        fileCopy(arguments.filePath, dest);
        touch(loaded.id);
        return { ok: true, session: describe(loaded.id) };
    }

    public struct function complete(required string uploadId) {
        var loaded = loadOwned(arguments.uploadId);
        if (!loaded.ok) {
            return loaded;
        }
        if (loaded.status == "completed" && len(loaded.documentId)) {
            return { ok: true, id: loaded.documentId, state: "pending_review", uploadId: loaded.id };
        }
        if (loaded.status != "open") {
            return { ok: false, error: "This upload cannot be completed." };
        }
        var received = listReceived(loaded.id);
        for (var missing = 0; missing LT loaded.chunkCount; missing++) {
            if (!fileExists(sessionDir(loaded.id) & "/" & missing & ".part")) {
                return { ok: false, error: "Not every chunk has been stored yet." };
            }
        }
        var assembled = getTempDirectory() & "idochive-upload-" & createUUID() & ".bin";
        var fos = createObject("java", "java.io.FileOutputStream").init(assembled, false);
        try {
            for (var i = 0; i LT loaded.chunkCount; i++) {
                var part = sessionDir(loaded.id) & "/" & i & ".part";
                var bytes = fileReadBinary(part);
                fos.write(bytes);
            }
        } finally {
            fos.close();
        }
        var created = new idochive.DocumentService().create(
            {
                title: loaded.filename,
                classCode: loaded.classCode,
                languageCode: loaded.languageCode,
                mimeType: loaded.mimeType
            },
            assembled
        );
        try {
            fileDelete(assembled);
        } catch (any ignore) {
        }
        if (!created.ok) {
            return created;
        }
        queryExecute(
            "
                UPDATE upload_sessions
                SET status = 'completed', document_id = CAST(:documentId AS uuid), updated_at = now()
                WHERE id = CAST(:uploadId AS uuid)
            ",
            {
                documentId: { value: created.id, cfsqltype: "cf_sql_varchar" },
                uploadId: { value: loaded.id, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        deleteDir(sessionDir(loaded.id));
        new idochive.AuditService().write("upload.completed", "upload", loaded.id, {
            documentId: created.id
        });
        return { ok: true, id: created.id, state: "pending_review", uploadId: loaded.id };
    }

    private struct function loadOwned(required string uploadId) {
        var id = trim(arguments.uploadId);
        if (!len(id) || !reFindNoCase("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", id)) {
            return { ok: false, notFound: true, error: "Upload was not found." };
        }
        var q = queryExecute(
            "
                SELECT id, organization_id, department_id, user_id, filename, mime_type,
                       byte_size, chunk_size, chunk_count, class_code, language_code,
                       status, document_id
                FROM upload_sessions
                WHERE id = CAST(:uploadId AS uuid)
            ",
            { uploadId: { value: id, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        if (q.recordCount == 0) {
            return { ok: false, notFound: true, error: "Upload was not found." };
        }
        if (toString(q.organization_id[1]) != session.organizationId || toString(q.user_id[1]) != session.userId) {
            return { ok: false, notFound: true, error: "Upload was not found." };
        }
        return {
            ok: true,
            id: toString(q.id[1]),
            filename: toString(q.filename[1]),
            mimeType: toString(q.mime_type[1]),
            byteSize: val(q.byte_size[1]),
            chunkSize: val(q.chunk_size[1]),
            chunkCount: val(q.chunk_count[1]),
            classCode: toString(q.class_code[1]),
            languageCode: toString(q.language_code[1]),
            status: toString(q.status[1]),
            documentId: toString(q.document_id[1] ?: "")
        };
    }

    private struct function describe(required string uploadId) {
        var loaded = loadOwned(arguments.uploadId);
        var received = listReceived(arguments.uploadId);
        return {
            "contractVersion": "1",
            "id": arguments.uploadId,
            "filename": loaded.filename,
            "mimeType": loaded.mimeType,
            "byteSize": loaded.byteSize,
            "chunkSize": loaded.chunkSize,
            "chunkCount": loaded.chunkCount,
            "receivedIndexes": received,
            "receivedCount": arrayLen(received),
            "status": loaded.status,
            "documentId": len(loaded.documentId) ? loaded.documentId : javacast("null", "")
        };
    }

    private array function listReceived(required string uploadId) {
        var dir = sessionDir(arguments.uploadId);
        var indexes = [];
        if (!directoryExists(dir)) {
            return indexes;
        }
        var names = directoryList(dir, false, "name", "*.part");
        for (var name in names) {
            var idx = val(listFirst(name, "."));
            arrayAppend(indexes, idx);
        }
        arraySort(indexes, "numeric", "asc");
        return indexes;
    }

    private string function sessionDir(required string uploadId) {
        return getDirectoryFromPath(expandPath("/Application.cfc")) & "storage/uploads/" & arguments.uploadId;
    }

    private void function touch(required string uploadId) {
        queryExecute(
            "UPDATE upload_sessions SET updated_at = now() WHERE id = CAST(:uploadId AS uuid)",
            { uploadId: { value: arguments.uploadId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
    }

    private void function deleteDir(required string dir) {
        if (len(arguments.dir) && directoryExists(arguments.dir)) {
            try {
                directoryDelete(arguments.dir, true);
            } catch (any ignore) {
            }
        }
    }

    private boolean function isAllowedMime(required string mimeType) {
        return listFindNoCase(
            "application/pdf,image/png,image/jpeg,image/jpg,image/tiff,image/tif,image/webp,image/gif,image/bmp",
            arguments.mimeType
        ) GT 0;
    }

    private string function normalizeMime(required string mimeType, required string filename) {
        var mime = lCase(trim(arguments.mimeType));
        if (isAllowedMime(mime)) {
            if (mime == "image/jpg") {
                return "image/jpeg";
            }
            return mime;
        }
        var extension = lCase(listLast(arguments.filename, "."));
        switch (extension) {
            case "pdf": return "application/pdf";
            case "png": return "image/png";
            case "jpg": case "jpeg": return "image/jpeg";
            case "tif": case "tiff": return "image/tiff";
            case "webp": return "image/webp";
            case "gif": return "image/gif";
            case "bmp": return "image/bmp";
        }
        return mime;
    }
}
