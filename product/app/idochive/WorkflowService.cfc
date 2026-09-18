component {

    public array function listOpen() {
        var q = queryExecute(
            "
                SELECT t.id, t.document_id, t.document_version_id, t.state, t.created_at,
                       d.title, (lk.document_id IS NOT NULL) AS locked, v.version_number
                FROM workflow_tasks t
                JOIN documents d ON d.id = t.document_id
                LEFT JOIN document_locks lk ON lk.document_id = d.id
                LEFT JOIN document_versions v ON v.id = t.document_version_id
                WHERE t.decided_at IS NULL
                  AND t.state = 'pending_review'
                  AND d.organization_id = CAST(:orgId AS uuid)
                  AND (
                      d.department_id = CAST(:deptId AS uuid)
                      OR :canSeeAll = true
                  )
                ORDER BY t.created_at DESC
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
                "documentId": toString(row.document_id),
                "title": toString(row.title),
                "state": toString(row.state),
                "locked": (row.locked ? true : false),
                "versionNumber": val(row.version_number),
                "createdAt": toString(row.created_at)
            });
        }
        return rows;
    }

    public struct function decide(required string taskId, required string state, string comment = "") {
        if (!canDecide()) {
            return { ok: false, error: "Access denied." };
        }
        var nextState = lCase(trim(arguments.state));
        if (!listFindNoCase("approved,rejected,changes_requested", nextState)) {
            return { ok: false, error: "State must be approved, rejected, or changes_requested." };
        }
        var task = queryExecute(
            "
                SELECT t.id, t.document_id, t.decided_at, d.organization_id, d.department_id,
                       (lk.document_id IS NOT NULL) AS locked
                FROM workflow_tasks t
                JOIN documents d ON d.id = t.document_id
                LEFT JOIN document_locks lk ON lk.document_id = d.id
                WHERE t.id = CAST(:taskId AS uuid)
            ",
            { taskId: { value: arguments.taskId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        if (task.recordCount == 0) {
            return { ok: false, error: "Task was not found." };
        }
        if (!new idochive.DocumentService().canAccess(toString(task.organization_id[1]), toString(task.department_id[1] ?: ""))) {
            return { ok: false, error: "Access denied." };
        }
        if (len(toString(task.decided_at[1] ?: ""))) {
            return { ok: false, error: "This task already has a decision." };
        }
        if (task.locked[1] && nextState != "approved") {
            return { ok: false, error: "This record is locked after approval." };
        }
        queryExecute(
            "
                UPDATE workflow_tasks
                SET state = :state,
                    comment = :comment,
                    decided_by = CAST(:userId AS uuid),
                    decided_at = now()
                WHERE id = CAST(:taskId AS uuid)
                  AND decided_at IS NULL
            ",
            {
                taskId: { value: arguments.taskId, cfsqltype: "cf_sql_varchar" },
                state: { value: nextState, cfsqltype: "cf_sql_varchar" },
                comment: { value: arguments.comment, cfsqltype: "cf_sql_varchar" },
                userId: { value: session.userId, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        var documentId = toString(task.document_id[1]);
        if (nextState == "approved") {
            queryExecute(
                "
                    INSERT INTO document_locks (document_id, locked_by)
                    VALUES (CAST(:documentId AS uuid), CAST(:userId AS uuid))
                    ON CONFLICT (document_id) DO NOTHING
                ",
                {
                    documentId: { value: documentId, cfsqltype: "cf_sql_varchar" },
                    userId: { value: session.userId, cfsqltype: "cf_sql_varchar" }
                },
                { datasource: "idochive" }
            );
        }
        if (len(trim(arguments.comment))) {
            addComment(documentId, arguments.comment, arguments.taskId);
        }
        new idochive.AuditService().write("workflow." & nextState, "document", documentId, {
            taskId: arguments.taskId,
            state: nextState
        });
        return { "ok": true, "state": nextState, "locked": nextState == "approved" };
    }

    public array function listComments(required string documentId) {
        var meta = new idochive.DocumentService().loadDocument(arguments.documentId);
        if (!meta.ok) {
            return [];
        }
        var q = queryExecute(
            "
                SELECT c.id, c.body, c.created_at, u.full_name
                FROM document_comments c
                JOIN users u ON u.id = c.created_by
                WHERE c.document_id = CAST(:documentId AS uuid)
                ORDER BY c.created_at ASC
            ",
            { documentId: { value: arguments.documentId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        var rows = [];
        for (var row in q) {
            arrayAppend(rows, {
                "id": toString(row.id),
                "body": toString(row.body),
                "author": toString(row.full_name),
                "createdAt": toString(row.created_at)
            });
        }
        return rows;
    }

    public struct function addComment(required string documentId, required string body, string taskId = "") {
        if (!len(trim(arguments.body))) {
            return { ok: false, error: "Comment text is required." };
        }
        var meta = new idochive.DocumentService().loadDocument(arguments.documentId);
        if (!meta.ok) {
            return meta;
        }
        queryExecute(
            "
                INSERT INTO document_comments (document_id, workflow_task_id, body, created_by)
                VALUES (
                    CAST(:documentId AS uuid),
                    CAST(:taskId AS uuid),
                    :body,
                    CAST(:userId AS uuid)
                )
            ",
            {
                documentId: { value: arguments.documentId, cfsqltype: "cf_sql_varchar" },
                taskId: { value: arguments.taskId, cfsqltype: "cf_sql_varchar", null: !len(arguments.taskId) },
                body: { value: trim(arguments.body), cfsqltype: "cf_sql_longvarchar" },
                userId: { value: session.userId, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        new idochive.AuditService().write("workflow.commented", "document", arguments.documentId, {});
        return { ok: true };
    }

    public boolean function canDecide() {
        var auth = new idochive.AuthService();
        return auth.hasRole("approver")
            || auth.hasRole("records_officer")
            || auth.hasRole("security_admin");
    }

    private boolean function canSeeAllDepartments() {
        var auth = new idochive.AuthService();
        return auth.hasRole("security_admin") || auth.hasRole("auditor") || auth.hasRole("platform_operator");
    }
}
