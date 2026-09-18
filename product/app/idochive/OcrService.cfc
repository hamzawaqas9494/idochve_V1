component {

    public array function listNeedsValidation() {
        var auth = new idochive.AuthService();
        var canSeeAll = auth.hasRole("security_admin") || auth.hasRole("auditor") || auth.hasRole("platform_operator");
        var q = queryExecute(
            "
                SELECT r.id, r.text_content, r.mean_confidence, r.language_code, r.created_at,
                       d.id AS document_id, d.title, d.department_id
                FROM ocr_results r
                JOIN document_versions v ON v.id = r.document_version_id
                JOIN documents d ON d.id = v.document_id
                WHERE r.status = 'needs_validation'
                  AND d.organization_id = CAST(:orgId AS uuid)
                  AND (
                      d.department_id = CAST(:deptId AS uuid)
                      OR :canSeeAll = true
                  )
                ORDER BY r.created_at DESC
            ",
            {
                orgId: { value: session.organizationId, cfsqltype: "cf_sql_varchar" },
                deptId: { value: session.departmentId, cfsqltype: "cf_sql_varchar", null: !len(session.departmentId ?: "") },
                canSeeAll: { value: canSeeAll, cfsqltype: "cf_sql_bit" }
            },
            { datasource: "idochive" }
        );
        var rows = [];
        for (var row in q) {
            arrayAppend(rows, {
                "id": toString(row.id),
                "documentId": toString(row.document_id),
                "title": toString(row.title),
                "language": toString(row.language_code),
                "meanConfidence": val(row.mean_confidence),
                "text": toString(row.text_content),
                "createdAt": toString(row.created_at)
            });
        }
        return rows;
    }

    public struct function correct(required string resultId, required string correctedText) {
        if (!len(trim(arguments.correctedText))) {
            return { ok: false, error: "Corrected text is required." };
        }
        var existing = queryExecute(
            "
                SELECT r.id, r.document_version_id, d.id AS document_id, d.organization_id, d.department_id
                FROM ocr_results r
                JOIN document_versions v ON v.id = r.document_version_id
                JOIN documents d ON d.id = v.document_id
                WHERE r.id = CAST(:resultId AS uuid)
                  AND r.status = 'needs_validation'
            ",
            { resultId: { value: arguments.resultId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        if (existing.recordCount == 0) {
            return { ok: false, error: "Validation item was not found." };
        }
        if (!canAccess(toString(existing.organization_id[1]), toString(existing.department_id[1]))) {
            return { ok: false, error: "Access denied." };
        }
        queryExecute(
            "
                INSERT INTO ocr_validations (ocr_result_id, corrected_text, decided_by)
                VALUES (CAST(:resultId AS uuid), :text, CAST(:userId AS uuid))
            ",
            {
                resultId: { value: arguments.resultId, cfsqltype: "cf_sql_varchar" },
                text: { value: arguments.correctedText, cfsqltype: "cf_sql_longvarchar" },
                userId: { value: session.userId, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        queryExecute(
            "
                UPDATE ocr_results
                SET status = 'corrected', text_content = :text
                WHERE id = CAST(:resultId AS uuid)
            ",
            {
                resultId: { value: arguments.resultId, cfsqltype: "cf_sql_varchar" },
                text: { value: arguments.correctedText, cfsqltype: "cf_sql_longvarchar" }
            },
            { datasource: "idochive" }
        );
        queryExecute(
            "
                INSERT INTO document_chunks (document_version_id, chunk_index, content)
                VALUES (CAST(:versionId AS uuid), 0, :content)
                ON CONFLICT (document_version_id, chunk_index)
                DO UPDATE SET content = EXCLUDED.content
            ",
            {
                versionId: { value: toString(existing.document_version_id[1]), cfsqltype: "cf_sql_varchar" },
                content: { value: arguments.correctedText, cfsqltype: "cf_sql_longvarchar" }
            },
            { datasource: "idochive" }
        );
        new idochive.EmbedService().enqueueForVersion(toString(existing.document_version_id[1]));
        new idochive.PolicyService().enqueueForVersion(
            toString(existing.document_id[1]),
            toString(existing.document_version_id[1])
        );
        new idochive.AuditService().write("ocr.corrected", "document", toString(existing.document_id[1]), {
            resultId: arguments.resultId
        });
        return { ok: true };
    }

    public boolean function canReview() {
        var auth = new idochive.AuthService();
        return auth.hasRole("records_officer")
            || auth.hasRole("document_controller")
            || auth.hasRole("approver")
            || auth.hasRole("security_admin");
    }

    private boolean function canAccess(required string organizationId, required string departmentId) {
        var auth = new idochive.AuthService();
        if (session.organizationId != arguments.organizationId) {
            return false;
        }
        if (auth.hasRole("security_admin") || auth.hasRole("auditor") || auth.hasRole("platform_operator")) {
            return true;
        }
        return session.departmentId == arguments.departmentId;
    }
}
