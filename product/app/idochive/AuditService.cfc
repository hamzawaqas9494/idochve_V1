component {

    public void function write(
        required string eventType,
        required string entityType,
        string entityId = "",
        struct detail = {}
    ) {
        var actor = structKeyExists(session, "userId") ? session.userId : "";
        queryExecute(
            "
                INSERT INTO audit_events (actor_id, event_type, entity_type, entity_id, detail)
                VALUES (CAST(:actor AS uuid), :eventType, :entityType, CAST(:entityId AS uuid), CAST(:detail AS jsonb))
            ",
            {
                actor: { value: actor, cfsqltype: "cf_sql_varchar", null: !len(actor) },
                eventType: { value: arguments.eventType, cfsqltype: "cf_sql_varchar" },
                entityType: { value: arguments.entityType, cfsqltype: "cf_sql_varchar" },
                entityId: { value: arguments.entityId, cfsqltype: "cf_sql_varchar", null: !len(arguments.entityId) },
                detail: { value: serializeJSON(arguments.detail), cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
    }

    public array function listForUser() {
        var q = queryExecute(
            "
                SELECT e.id, e.actor_id, e.event_type, e.entity_type, e.entity_id, e.detail, e.created_at
                FROM audit_events e
                LEFT JOIN users actor ON actor.id = e.actor_id
                LEFT JOIN documents doc ON e.entity_type = 'document' AND doc.id = e.entity_id
                LEFT JOIN users subject ON e.entity_type = 'user' AND subject.id = e.entity_id
                WHERE COALESCE(actor.organization_id, doc.organization_id, subject.organization_id)
                      = CAST(:orgId AS uuid)
                  AND (
                      :canSeeAll = true
                      OR COALESCE(actor.department_id, doc.department_id, subject.department_id)
                         = CAST(:deptId AS uuid)
                  )
                ORDER BY e.created_at DESC
                LIMIT 50
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
                "actorId": toString(row.actor_id ?: ""),
                "eventType": toString(row.event_type),
                "entityType": toString(row.entity_type),
                "entityId": toString(row.entity_id ?: ""),
                "detail": detailOf(row.detail),
                "createdAt": row.created_at
            });
        }
        return rows;
    }

    private any function detailOf(required any value) {
        if (isNull(arguments.value)) {
            return {};
        }
        if (isStruct(arguments.value)) {
            return arguments.value;
        }
        var text = toString(arguments.value);
        if (isJSON(text)) {
            return deserializeJSON(text);
        }
        return {};
    }

    private boolean function canSeeAllDepartments() {
        var auth = new idochive.AuthService();
        return auth.hasRole("security_admin") || auth.hasRole("auditor") || auth.hasRole("platform_operator");
    }
}
