component {

    public array function listForUser() {
        var q = queryExecute(
            "
                SELECT d.id, d.title, d.language_code, dc.code AS class_code,
                       d.department_id, d.created_at,
                       (lk.document_id IS NOT NULL) AS locked,
                       (
                           SELECT max(v.version_number)
                           FROM document_versions v
                           WHERE v.document_id = d.id
                       ) AS current_version,
                       (
                           SELECT t.state
                           FROM workflow_tasks t
                           WHERE t.document_id = d.id
                           ORDER BY t.created_at DESC
                           LIMIT 1
                       ) AS workflow_state,
                       (
                           SELECT t.id
                           FROM workflow_tasks t
                           WHERE t.document_id = d.id
                             AND t.decided_at IS NULL
                           ORDER BY t.created_at DESC
                           LIMIT 1
                       ) AS open_task_id
                FROM documents d
                LEFT JOIN document_classes dc ON dc.id = d.class_id
                LEFT JOIN document_locks lk ON lk.document_id = d.id
                WHERE d.organization_id = CAST(:orgId AS uuid)
                  AND (
                      d.department_id = CAST(:deptId AS uuid)
                      OR :canSeeAll = true
                  )
                ORDER BY d.created_at DESC
            ",
            {
                orgId: { value: session.organizationId, cfsqltype: "cf_sql_varchar" },
                deptId: { value: session.departmentId, cfsqltype: "cf_sql_varchar", null: !len(session.departmentId ?: "") },
                canSeeAll: { value: canSeeAllDepartments(), cfsqltype: "cf_sql_bit" }
            },
            { datasource: "idochive" }
        );
        var rows = [];
        for (var row in q) {
            arrayAppend(rows, {
                "id": toString(row.id),
                "title": toString(row.title),
                "language": toString(row.language_code),
                "classCode": toString(row.class_code ?: ""),
                "departmentId": toString(row.department_id ?: ""),
                "currentVersion": row.current_version,
                "workflowState": toString(row.workflow_state ?: ""),
                "locked": (row.locked ? true : false),
                "openTaskId": toString(row.open_task_id ?: ""),
                "createdAt": toString(row.created_at)
            });
        }
        return rows;
    }

    public struct function create(required struct input, required any fileUpload) {
        if (!len(arguments.input.title ?: "")) {
            return { ok: false, error: "Title is required." };
        }
        var classId = resolveClass(arguments.input.classCode ?: "project_report");
        var doc = queryExecute(
            "
                INSERT INTO documents (
                    organization_id, department_id, class_id, title, language_code, created_by
                ) VALUES (
                    CAST(:orgId AS uuid), CAST(:deptId AS uuid), CAST(:classId AS uuid), :title, :lang, CAST(:userId AS uuid)
                )
                RETURNING id
            ",
            {
                orgId: { value: session.organizationId, cfsqltype: "cf_sql_varchar" },
                deptId: { value: session.departmentId, cfsqltype: "cf_sql_varchar", null: !len(session.departmentId ?: "") },
                classId: { value: classId, cfsqltype: "cf_sql_varchar" },
                title: { value: arguments.input.title, cfsqltype: "cf_sql_varchar" },
                lang: { value: arguments.input.languageCode ?: "en", cfsqltype: "cf_sql_varchar" },
                userId: { value: session.userId, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        var documentId = toString(doc.id[1]);
        var stored = new idochive.BlobStore().writeEncrypted(
            documentId,
            arguments.fileUpload,
            arguments.input.mimeType ?: "application/octet-stream"
        );
        var ver = queryExecute(
            "
                INSERT INTO document_versions (
                    document_id, version_number, blob_key, checksum_sha256,
                    byte_size, mime_type, encrypted, immutable, created_by
                ) VALUES (
                    CAST(:documentId AS uuid), 1, :blobKey, :checksum,
                    :byteSize, :mimeType, true, true, CAST(:userId AS uuid)
                )
                RETURNING id
            ",
            {
                documentId: { value: documentId, cfsqltype: "cf_sql_varchar" },
                blobKey: { value: stored.blobKey, cfsqltype: "cf_sql_varchar" },
                checksum: { value: stored.checksum, cfsqltype: "cf_sql_varchar" },
                byteSize: { value: stored.byteSize, cfsqltype: "cf_sql_integer" },
                mimeType: { value: stored.mimeType, cfsqltype: "cf_sql_varchar" },
                userId: { value: session.userId, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        var versionId = toString(ver.id[1]);
        queryExecute(
            "
                INSERT INTO workflow_tasks (document_id, document_version_id, state, assigned_to)
                VALUES (CAST(:documentId AS uuid), CAST(:versionId AS uuid), 'pending_review', CAST(:userId AS uuid))
            ",
            {
                documentId: { value: documentId, cfsqltype: "cf_sql_varchar" },
                versionId: { value: versionId, cfsqltype: "cf_sql_varchar" },
                userId: { value: session.userId, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        new idochive.AuditService().write("ingestion.received", "document", documentId, {
            title: arguments.input.title,
            encrypted: true
        });
        new idochive.IngestService().enqueue(documentId, versionId);
        return { ok: true, id: documentId, versionId: versionId };
    }

    public struct function addVersion(required string documentId, required any fileUpload, string mimeType = "application/octet-stream") {
        var meta = loadDocument(arguments.documentId);
        if (!meta.ok) {
            return meta;
        }
        if (meta.locked) {
            return { ok: false, error: "This record is locked after approval. A new version is not allowed." };
        }
        if (meta.workflowState == "approved") {
            return { ok: false, error: "Approved records cannot receive a new version." };
        }
        if (meta.workflowState != "changes_requested" && meta.workflowState != "rejected") {
            return { ok: false, error: "A new version is allowed only after changes are requested or the version is rejected." };
        }
        var nextNumber = val(meta.currentVersion) + 1;
        var stored = new idochive.BlobStore().writeEncrypted(
            arguments.documentId,
            arguments.fileUpload,
            arguments.mimeType,
            nextNumber
        );
        var ver = queryExecute(
            "
                INSERT INTO document_versions (
                    document_id, version_number, blob_key, checksum_sha256,
                    byte_size, mime_type, encrypted, immutable, created_by
                ) VALUES (
                    CAST(:documentId AS uuid), :versionNumber, :blobKey, :checksum,
                    :byteSize, :mimeType, true, true, CAST(:userId AS uuid)
                )
                RETURNING id
            ",
            {
                documentId: { value: arguments.documentId, cfsqltype: "cf_sql_varchar" },
                versionNumber: { value: nextNumber, cfsqltype: "cf_sql_integer" },
                blobKey: { value: stored.blobKey, cfsqltype: "cf_sql_varchar" },
                checksum: { value: stored.checksum, cfsqltype: "cf_sql_varchar" },
                byteSize: { value: stored.byteSize, cfsqltype: "cf_sql_integer" },
                mimeType: { value: stored.mimeType, cfsqltype: "cf_sql_varchar" },
                userId: { value: session.userId, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        var versionId = toString(ver.id[1]);
        queryExecute(
            "
                INSERT INTO workflow_tasks (document_id, document_version_id, state, assigned_to)
                VALUES (CAST(:documentId AS uuid), CAST(:versionId AS uuid), 'pending_review', CAST(:userId AS uuid))
            ",
            {
                documentId: { value: arguments.documentId, cfsqltype: "cf_sql_varchar" },
                versionId: { value: versionId, cfsqltype: "cf_sql_varchar" },
                userId: { value: session.userId, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        new idochive.IngestService().enqueue(arguments.documentId, versionId);
        new idochive.AuditService().write("version.created", "document", arguments.documentId, {
            versionNumber: nextNumber,
            versionId: versionId
        });
        return { ok: true, id: arguments.documentId, versionId: versionId, versionNumber: nextNumber };
    }

    public struct function exportOriginal(required string documentId) {
        var id = trim(arguments.documentId);
        if (!len(id)) {
            return { ok: false, notFound: true, error: "Document was not found." };
        }
        var q = queryExecute(
            "
                SELECT d.id, d.title, d.organization_id, d.department_id,
                       v.blob_key, v.mime_type
                FROM documents d
                JOIN document_versions v ON v.document_id = d.id
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
        if (!canAccess(toString(q.organization_id[1]), toString(q.department_id[1] ?: ""))) {
            return { ok: false, notFound: true, error: "Document was not found." };
        }
        try {
            var tempPath = new idochive.BlobStore().decryptToTemp(
                toString(q.blob_key[1]),
                toString(q.mime_type[1] ?: "application/octet-stream")
            );
        } catch (any err) {
            return { ok: false, notFound: true, error: "Document was not found." };
        }
        new idochive.AuditService().write("document.exported", "document", toString(q.id[1]), {
            documentId: toString(q.id[1])
        });
        return {
            ok: true,
            tempPath: tempPath,
            mimeType: toString(q.mime_type[1] ?: "application/octet-stream"),
            filename: safeFilename(toString(q.title[1]), toString(q.mime_type[1] ?: ""))
        };
    }

    public struct function loadDocument(required string documentId) {
        var q = queryExecute(
            "
                SELECT d.id, d.organization_id, d.department_id,
                       (lk.document_id IS NOT NULL) AS locked,
                       (
                           SELECT max(v.version_number)
                           FROM document_versions v
                           WHERE v.document_id = d.id
                       ) AS current_version,
                       (
                           SELECT t.state
                           FROM workflow_tasks t
                           WHERE t.document_id = d.id
                           ORDER BY t.created_at DESC
                           LIMIT 1
                       ) AS workflow_state
                FROM documents d
                LEFT JOIN document_locks lk ON lk.document_id = d.id
                WHERE d.id = CAST(:documentId AS uuid)
            ",
            { documentId: { value: arguments.documentId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        if (q.recordCount == 0) {
            return { ok: false, error: "Document was not found." };
        }
        if (!canAccess(toString(q.organization_id[1]), toString(q.department_id[1] ?: ""))) {
            return { ok: false, error: "Access denied." };
        }
        return {
            ok: true,
            id: toString(q.id[1]),
            locked: (q.locked[1] ? true : false),
            currentVersion: val(q.current_version[1]),
            workflowState: toString(q.workflow_state[1] ?: "")
        };
    }

    public boolean function canAccess(required string organizationId, required string departmentId) {
        if (session.organizationId != arguments.organizationId) {
            return false;
        }
        if (canSeeAllDepartments()) {
            return true;
        }
        return session.departmentId == arguments.departmentId;
    }

    private boolean function canSeeAllDepartments() {
        var auth = new idochive.AuthService();
        return auth.hasRole("security_admin") || auth.hasRole("auditor") || auth.hasRole("platform_operator");
    }

    private string function safeFilename(required string title, required string mimeType) {
        var base = rereplace(trim(arguments.title), "[^A-Za-z0-9._-]+", "_", "all");
        if (!len(base)) {
            base = "document";
        }
        var ext = new idochive.BlobStore().extensionFromMime(arguments.mimeType);
        if (right(lCase(base), len(ext) + 1) == "." & ext) {
            return left(base, 120);
        }
        return left(base, 120) & "." & ext;
    }

    private string function resolveClass(required string code) {
        var q = queryExecute(
            "SELECT id FROM document_classes WHERE code = :code",
            { code: { value: arguments.code, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        return q.recordCount ? q.id[1] : "";
    }

}
