component {

    public struct function run(
        required string q,
        string classCode = "",
        string languageCode = "",
        boolean semantic = false
    ) {
        var queryText = trim(arguments.q);
        var classFilter = trim(arguments.classCode);
        var langFilter = trim(arguments.languageCode);
        if (!len(queryText) && !len(classFilter) && !len(langFilter)) {
            return {
                "results": [],
                "semanticApplied": false,
                "emptyReason": "enter_query",
                "emptyMessage": "Enter a keyword or choose a class or language filter."
            };
        }

        var wantSemantic = arguments.semantic && len(queryText);
        var qvec = zeroVectorLiteral();
        var semanticApplied = false;
        if (wantSemantic) {
            var embedded = new idochive.ModelGateway().embed(queryText, 15);
            if (embedded.ok) {
                qvec = new idochive.ModelGateway().vectorLiteral(embedded.vector);
                semanticApplied = true;
            }
        }

        var auth = new idochive.AuthService();
        var canSeeAll = auth.hasRole("security_admin") || auth.hasRole("auditor") || auth.hasRole("platform_operator");
        var pattern = likePattern(queryText);
        var hasKeyword = len(queryText);
        var qres = queryExecute(
            "
                WITH authorized AS (
                    SELECT d.id, d.title, d.language_code, dc.code AS class_code, dc.name AS class_name, d.created_at
                    FROM documents d
                    LEFT JOIN document_classes dc ON dc.id = d.class_id
                    WHERE d.organization_id = CAST(:orgId AS uuid)
                      AND (
                          d.department_id = CAST(:deptId AS uuid)
                          OR :canSeeAll = true
                      )
                      AND (
                          :hasClass = false
                          OR dc.code = :classCode
                      )
                      AND (
                          :hasLang = false
                          OR d.language_code = :languageCode
                      )
                ),
                keyword_hits AS (
                    SELECT a.id,
                           ROW_NUMBER() OVER (ORDER BY a.created_at DESC) AS rnk
                    FROM authorized a
                    WHERE :hasKeyword = false
                       OR a.title ILIKE :pattern ESCAPE '\'
                       OR COALESCE(a.class_code, '') ILIKE :pattern ESCAPE '\'
                       OR COALESCE(a.class_name, '') ILIKE :pattern ESCAPE '\'
                       OR EXISTS (
                           SELECT 1
                           FROM document_chunks c
                           JOIN document_versions v ON v.id = c.document_version_id
                           WHERE v.document_id = a.id
                             AND c.content ILIKE :pattern ESCAPE '\'
                       )
                ),
                vector_hits AS (
                    SELECT a.id,
                           ROW_NUMBER() OVER (ORDER BY MIN(e.embedding <=> CAST(:qvec AS vector))) AS rnk
                    FROM authorized a
                    JOIN document_versions v ON v.document_id = a.id
                    JOIN document_chunks c ON c.document_version_id = v.id
                    JOIN chunk_embeddings e ON e.chunk_id = c.id
                    WHERE :useVector = true
                      AND e.model_version_id = CAST(:modelVersionId AS uuid)
                      AND e.embedding <=> CAST(:qvec AS vector) < 0.42
                    GROUP BY a.id
                ),
                fused AS (
                    SELECT COALESCE(k.id, vh.id) AS id,
                           COALESCE(1.0 / (60 + k.rnk), 0) + COALESCE(1.0 / (60 + vh.rnk), 0) AS score,
                           CASE
                               WHEN k.id IS NOT NULL AND vh.id IS NOT NULL THEN 'hybrid'
                               WHEN vh.id IS NOT NULL THEN 'semantic'
                               ELSE 'keyword'
                           END AS match_type
                    FROM keyword_hits k
                    FULL OUTER JOIN vector_hits vh ON vh.id = k.id
                )
                SELECT a.id, a.title, a.language_code, a.class_code,
                       f.match_type,
                       (
                           SELECT max(v.version_number)
                           FROM document_versions v
                           WHERE v.document_id = a.id
                       ) AS current_version,
                       (
                           SELECT t.state
                           FROM workflow_tasks t
                           WHERE t.document_id = a.id
                           ORDER BY t.created_at DESC
                           LIMIT 1
                       ) AS workflow_state
                FROM fused f
                JOIN authorized a ON a.id = f.id
                ORDER BY f.score DESC, a.created_at DESC
                LIMIT 50
            ",
            {
                orgId: { value: session.organizationId, cfsqltype: "cf_sql_varchar" },
                deptId: { value: session.departmentId, cfsqltype: "cf_sql_varchar", null: !len(session.departmentId ?: "") },
                canSeeAll: { value: canSeeAll, cfsqltype: "cf_sql_bit" },
                hasClass: { value: len(classFilter) GT 0, cfsqltype: "cf_sql_bit" },
                classCode: { value: classFilter, cfsqltype: "cf_sql_varchar" },
                hasLang: { value: len(langFilter) GT 0, cfsqltype: "cf_sql_bit" },
                languageCode: { value: langFilter, cfsqltype: "cf_sql_varchar" },
                hasKeyword: { value: hasKeyword, cfsqltype: "cf_sql_bit" },
                pattern: { value: pattern, cfsqltype: "cf_sql_varchar" },
                useVector: { value: semanticApplied, cfsqltype: "cf_sql_bit" },
                qvec: { value: qvec, cfsqltype: "cf_sql_varchar" },
                modelVersionId: { value: new idochive.EmbedService().currentModelVersionId(), cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );

        var rows = [];
        for (var row in qres) {
            arrayAppend(rows, {
                "id": toString(row.id),
                "title": toString(row.title),
                "language": toString(row.language_code),
                "classCode": toString(row.class_code ?: ""),
                "currentVersion": row.current_version,
                "workflowState": toString(row.workflow_state ?: ""),
                "matchType": toString(row.match_type ?: "keyword")
            });
        }

        new idochive.AuditService().write("search.executed", "search", "", {
            q: queryText,
            classCode: classFilter,
            languageCode: langFilter,
            semantic: semanticApplied,
            authorizedCount: arrayLen(rows)
        });

        if (arrayLen(rows) == 0) {
            return {
                "results": [],
                "semanticApplied": semanticApplied,
                "emptyReason": "no_authorized_matches",
                "emptyMessage": "No authorized records match. This does not indicate whether other departments hold matching files."
            };
        }
        return { "results": rows, "semanticApplied": semanticApplied };
    }

    private string function zeroVectorLiteral() {
        var parts = [];
        var i = 0;
        for (i = 1; i <= 768; i++) {
            arrayAppend(parts, "0");
        }
        return "[" & arrayToList(parts, ",") & "]";
    }

    private string function likePattern(required string q) {
        if (!len(arguments.q)) {
            return "%";
        }
        var safe = replace(arguments.q, "\", "\\", "all");
        safe = replace(safe, "%", "\%", "all");
        safe = replace(safe, "_", "\_", "all");
        return "%" & safe & "%";
    }
}
