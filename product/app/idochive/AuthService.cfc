component {

    public struct function login(required string email, required string password) {
        var q = queryExecute(
            "
                SELECT u.id, u.full_name, u.email, u.organization_id, u.department_id
                FROM users u
                WHERE u.email = :email
                  AND u.is_active = true
                  AND u.password_hash = crypt(:password, u.password_hash)
            ",
            {
                email: { value: arguments.email, cfsqltype: "cf_sql_varchar" },
                password: { value: arguments.password, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        if (q.recordCount == 0) {
            return { ok: false };
        }
        session.userId = asText(q.id[1]);
        session.email = asText(q.email[1]);
        session.fullName = asText(q.full_name[1]);
        session.organizationId = asText(q.organization_id[1]);
        session.departmentId = asText(q.department_id[1]);
        session.roles = listRoles(session.userId);
        new idochive.AuditService().write("auth.login", "user", session.userId, { email: session.email });
        return { ok: true, user: currentUser() };
    }

    public void function logout() {
        if (structKeyExists(session, "userId")) {
            new idochive.AuditService().write("auth.logout", "user", session.userId, {});
        }
        structClear(session);
    }

    public boolean function isAuthenticated() {
        return structKeyExists(session, "userId") && len(session.userId);
    }

    public struct function currentUser() {
        if (!isAuthenticated()) {
            return {};
        }
        return {
            "id": session.userId,
            "email": session.email,
            "fullName": session.fullName,
            "organizationId": session.organizationId,
            "departmentId": session.departmentId,
            "roles": session.roles
        };
    }

    public boolean function hasRole(required string code) {
        if (!isAuthenticated()) {
            return false;
        }
        return arrayFindNoCase(session.roles, arguments.code) GT 0;
    }

    private string function asText(required any value) {
        if (isNull(arguments.value)) {
            return "";
        }
        if (isStruct(arguments.value) && structKeyExists(arguments.value, "value")) {
            return toString(arguments.value.value);
        }
        return toString(arguments.value);
    }

    private array function listRoles(required string userId) {
        var q = queryExecute(
            "
                SELECT r.code
                FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = CAST(:userId AS uuid)
            ",
            { userId: { value: arguments.userId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        var codes = [];
        for (var row in q) {
            arrayAppend(codes, row.code);
        }
        return codes;
    }
}
