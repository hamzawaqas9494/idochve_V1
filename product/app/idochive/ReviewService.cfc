component {

    public array function listClassifications() {
        return listRows("classification_results", "proposed_code");
    }

    public array function listExtractions() {
        var q = queryExecute(
            "
                SELECT r.id, r.document_id, r.payload, r.state, r.created_at, d.title
                FROM extraction_results r
                JOIN documents d ON d.id = r.document_id
                WHERE r.state = 'pending_review'
                  AND d.organization_id = CAST(:orgId AS uuid)
                  AND (
                      d.department_id = CAST(:deptId AS uuid)
                      OR :canSeeAll = true
                  )
                ORDER BY r.created_at DESC
                LIMIT 20
            ",
            authParams(),
            { datasource: "idochive" }
        );
        var rows = [];
        for (var row in q) {
            var payload = {};
            if (isStruct(row.payload)) {
                payload = row.payload;
            } else if (isJSON(toString(row.payload))) {
                payload = deserializeJSON(toString(row.payload));
            }
            arrayAppend(rows, {
                "id": toString(row.id),
                "documentId": toString(row.document_id),
                "title": toString(row.title),
                "payload": payload,
                "state": toString(row.state),
                "createdAt": toString(row.created_at)
            });
        }
        return rows;
    }

    public struct function decideClassification(required string id, required string state) {
        var decided = decideRow("classification_results", arguments.id, arguments.state);
        if (!decided.ok) {
            return decided;
        }
        if (lCase(arguments.state) == "approved") {
            tryApplyClass(arguments.id);
        }
        return decided;
    }

    public struct function decideExtraction(required string id, required string state) {
        return decideRow("extraction_results", arguments.id, arguments.state);
    }

    public boolean function canDecide() {
        var auth = new idochive.AuthService();
        return auth.hasRole("records_officer") || auth.hasRole("approver") || auth.hasRole("security_admin");
    }

    private array function listRows(required string tableName, required string extraCol) {
        var q = queryExecute(
            "
                SELECT r.id, r.document_id, r.#arguments.extraCol# AS extra, r.state, r.created_at, d.title
                FROM #arguments.tableName# r
                JOIN documents d ON d.id = r.document_id
                WHERE r.state = 'pending_review'
                  AND d.organization_id = CAST(:orgId AS uuid)
                  AND (
                      d.department_id = CAST(:deptId AS uuid)
                      OR :canSeeAll = true
                  )
                ORDER BY r.created_at DESC
                LIMIT 20
            ",
            authParams(),
            { datasource: "idochive" }
        );
        var rows = [];
        for (var row in q) {
            arrayAppend(rows, {
                "id": toString(row.id),
                "documentId": toString(row.document_id),
                "title": toString(row.title),
                "proposedCode": toString(row.extra ?: ""),
                "state": toString(row.state),
                "createdAt": toString(row.created_at)
            });
        }
        return rows;
    }

    private struct function decideRow(required string tableName, required string id, required string state) {
        if (!canDecide()) {
            return { ok: false, error: "Access denied." };
        }
        var nextState = lCase(trim(arguments.state));
        if (!listFindNoCase("approved,rejected,changes_requested", nextState)) {
            return { ok: false, error: "State must be approved, rejected, or changes_requested." };
        }
        queryExecute(
            "
                UPDATE #arguments.tableName#
                SET state = :state,
                    decided_by = CAST(:userId AS uuid),
                    decided_at = now()
                WHERE id = CAST(:id AS uuid)
                  AND state = 'pending_review'
            ",
            {
                state: { value: nextState, cfsqltype: "cf_sql_varchar" },
                userId: { value: session.userId, cfsqltype: "cf_sql_varchar" },
                id: { value: arguments.id, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        new idochive.AuditService().write("review.decided", "document", "", {
            tableName: arguments.tableName,
            id: arguments.id,
            state: nextState
        });
        return { ok: true };
    }

    private void function tryApplyClass(required string resultId) {
        try {
            queryExecute(
                "
                    UPDATE documents d
                    SET class_id = dc.id
                    FROM classification_results r
                    JOIN document_classes dc ON dc.code = r.proposed_code
                    WHERE r.id = CAST(:id AS uuid)
                      AND d.id = r.document_id
                      AND length(trim(r.proposed_code)) > 0
                ",
                { id: { value: arguments.resultId, cfsqltype: "cf_sql_varchar" } },
                { datasource: "idochive" }
            );
        } catch (any ignore) {
        }
    }

    private struct function authParams() {
        var auth = new idochive.AuthService();
        var canSeeAll = auth.hasRole("security_admin") || auth.hasRole("auditor") || auth.hasRole("platform_operator");
        return {
            orgId: { value: session.organizationId, cfsqltype: "cf_sql_varchar" },
            deptId: { value: session.departmentId, cfsqltype: "cf_sql_varchar", null: !len(session.departmentId ?: "") },
            canSeeAll: { value: canSeeAll, cfsqltype: "cf_sql_bit" }
        };
    }
}
