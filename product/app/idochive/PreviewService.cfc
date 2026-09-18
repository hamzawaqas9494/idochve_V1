component {

    public struct function meta(required string documentId) {
        var loaded = loadAuthorized(arguments.documentId);
        if (!loaded.ok) {
            return loaded;
        }
        var totalPages = resolveTotalPages(loaded);
        new idochive.AuditService().write("document.viewed", "document", loaded.id, {
            documentId: loaded.id
        });
        return {
            ok: true,
            id: loaded.id,
            title: loaded.title,
            mimeType: loaded.mimeType,
            workflowState: loaded.workflowState,
            locked: loaded.locked,
            currentVersion: loaded.currentVersion,
            totalPages: totalPages,
            citations: listCitations(loaded.versionId, totalPages)
        };
    }

    public struct function pageImage(required string documentId, required numeric page) {
        var loaded = loadAuthorized(arguments.documentId);
        if (!loaded.ok) {
            return loaded;
        }
        var totalPages = resolveTotalPages(loaded);
        var pageNum = int(arguments.page);
        if (pageNum LT 1 || pageNum GT totalPages) {
            return { ok: false, error: "That page is not in this document." };
        }
        var store = new idochive.BlobStore();
        var sourcePath = "";
        try {
            sourcePath = store.decryptToTemp(loaded.blobKey, loaded.mimeType);
            var mime = lCase(trim(toString(loaded.mimeType)));
            if (isPdfMime(mime)) {
                var rendered = new idochive.PdfRasterizer().rasterizePage(sourcePath, pageNum);
                store.deleteTemp(sourcePath);
                sourcePath = "";
                if (!rendered.ok) {
                    return { ok: false, error: rendered.error };
                }
                var dest = getTempDirectory() & "idochive-page-" & createUUID() & ".png";
                fileCopy(rendered.path, dest);
                new idochive.PdfRasterizer().deleteDir(rendered.dir);
                new idochive.AuditService().write("document.previewed", "document", loaded.id, {
                    documentId: loaded.id,
                    page: pageNum
                });
                return { ok: true, tempPath: dest, mimeType: "image/png" };
            }
            if (isImageMime(mime)) {
                new idochive.AuditService().write("document.previewed", "document", loaded.id, {
                    documentId: loaded.id,
                    page: 1
                });
                return { ok: true, tempPath: sourcePath, mimeType: loaded.mimeType };
            }
            store.deleteTemp(sourcePath);
            return { ok: false, error: "Preview is available for PDF and image originals." };
        } catch (any err) {
            if (len(sourcePath)) {
                store.deleteTemp(sourcePath);
            }
            return { ok: false, notFound: true, error: "Document was not found." };
        }
    }

    private struct function loadAuthorized(required string documentId) {
        var id = trim(arguments.documentId);
        if (!len(id) || !reFindNoCase("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", id)) {
            return { ok: false, notFound: true, error: "Document was not found." };
        }
        var q = queryExecute(
            "
                SELECT d.id, d.title, d.organization_id, d.department_id,
                       (lk.document_id IS NOT NULL) AS locked,
                       v.id AS version_id, v.blob_key, v.mime_type, v.version_number,
                       (
                           SELECT t.state
                           FROM workflow_tasks t
                           WHERE t.document_id = d.id
                           ORDER BY t.created_at DESC
                           LIMIT 1
                       ) AS workflow_state
                FROM documents d
                JOIN document_versions v ON v.document_id = d.id
                LEFT JOIN document_locks lk ON lk.document_id = d.id
                WHERE d.id = CAST(:documentId AS uuid)
                ORDER BY v.version_number DESC
                LIMIT 1
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
        return {
            ok: true,
            id: toString(q.id[1]),
            title: toString(q.title[1]),
            mimeType: toString(q.mime_type[1] ?: "application/octet-stream"),
            blobKey: toString(q.blob_key[1]),
            versionId: toString(q.version_id[1]),
            currentVersion: val(q.version_number[1]),
            workflowState: toString(q.workflow_state[1] ?: ""),
            locked: (q.locked[1] ? true : false)
        };
    }

    private numeric function resolveTotalPages(required struct loaded) {
        var progress = queryExecute(
            "
                SELECT total_pages
                FROM ocr_progress
                WHERE document_id = CAST(:documentId AS uuid)
                ORDER BY updated_at DESC
                LIMIT 1
            ",
            { documentId: { value: arguments.loaded.id, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        if (progress.recordCount && val(progress.total_pages[1]) GT 0) {
            return val(progress.total_pages[1]);
        }
        if (isImageMime(arguments.loaded.mimeType)) {
            return 1;
        }
        if (!isPdfMime(arguments.loaded.mimeType)) {
            return 1;
        }
        var store = new idochive.BlobStore();
        var tempPath = "";
        try {
            tempPath = store.decryptToTemp(arguments.loaded.blobKey, arguments.loaded.mimeType);
            var counted = new idochive.PdfRasterizer().pageCount(tempPath);
            store.deleteTemp(tempPath);
            if (counted GT 0) {
                return counted;
            }
        } catch (any err) {
            if (len(tempPath)) {
                store.deleteTemp(tempPath);
            }
        }
        return 1;
    }

    private array function listCitations(required string versionId, required numeric totalPages) {
        var q = queryExecute(
            "
                SELECT chunk_index, content
                FROM document_chunks
                WHERE document_version_id = CAST(:versionId AS uuid)
                ORDER BY chunk_index
            ",
            { versionId: { value: arguments.versionId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        var items = [];
        var pages = max(1, arguments.totalPages);
        for (var i = 1; i <= q.recordCount; i++) {
            var idx = val(q.chunk_index[i]);
            var page = idx + 1;
            if (page LT 1 || page GT pages) {
                page = 1;
            }
            arrayAppend(items, {
                "chunkIndex": idx,
                "page": page,
                "excerpt": left(toString(q.content[i] ?: ""), 400)
            });
        }
        return items;
    }

    private boolean function isPdfMime(required string mimeType) {
        var mime = lCase(trim(arguments.mimeType));
        return mime EQ "application/pdf" OR mime EQ "application/x-pdf";
    }

    private boolean function isImageMime(required string mimeType) {
        return listFirst(lCase(trim(arguments.mimeType)), "/") EQ "image";
    }
}
