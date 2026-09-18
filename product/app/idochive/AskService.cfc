component {

    public struct function ask(required string question) {
        var queryText = trim(arguments.question);
        if (!len(queryText)) {
            return {
                "ok": false,
                "emptyReason": "enter_query",
                "emptyMessage": "Enter a question about records you are authorized to see."
            };
        }

        var chunks = retrieveChunks(queryText);
        if (!arrayLen(chunks)) {
            return {
                "ok": false,
                "emptyReason": "no_authorized_matches",
                "emptyMessage": "No authorized records match. This does not indicate whether other departments hold matching files."
            };
        }

        var policy = new idochive.PolicyService().active("ask_grounded");
        var gateway = new idochive.ModelGateway();
        var generated = gateway.generate(buildPrompt(queryText, chunks, policy.body), 60);
        var mode = generated.ok ? "generated" : "extractive";
        var answer = generated.ok ? generated.text : extractiveAnswer(chunks);
        var modelVersionId = generated.ok ? currentGenerateModelVersionId() : "";

        var saved = persist(queryText, answer, mode, modelVersionId, chunks);
        var citationIds = [];
        for (var c in chunks) {
            arrayAppend(citationIds, c.documentId);
        }
        new idochive.AuditService().write("policy.used", "ask", saved.requestId, {
            requestId: saved.requestId,
            responseId: saved.responseId,
            policyCode: "ask_grounded",
            policyVersionId: policy.versionId
        });
        new idochive.AuditService().write("ask.completed", "ask", saved.requestId, {
            requestId: saved.requestId,
            responseId: saved.responseId,
            mode: mode,
            modelVersionId: modelVersionId,
            policyVersionId: policy.versionId,
            authorizedCount: arrayLen(chunks),
            citationDocumentIds: citationIds
        });

        return {
            "ok": true,
            "item": loadItem(saved.responseId)
        };
    }

    public array function listRecent() {
        var q = queryExecute(
            "
                SELECT r.id AS request_id, r.question, r.created_at,
                       s.id AS response_id, s.answer, s.mode, s.state
                FROM ai_requests r
                JOIN ai_responses s ON s.request_id = r.id
                WHERE r.actor_id = CAST(:actorId AS uuid)
                   OR (
                       :canReview = true
                       AND s.state = 'pending_review'
                   )
                ORDER BY r.created_at DESC
                LIMIT 20
            ",
            {
                actorId: { value: session.userId, cfsqltype: "cf_sql_varchar" },
                canReview: { value: canDecide(), cfsqltype: "cf_sql_bit" }
            },
            { datasource: "idochive" }
        );
        var items = [];
        for (var row in q) {
            arrayAppend(items, loadItem(toString(row.response_id)));
        }
        return items;
    }

    public struct function decide(required string responseId, required string state) {
        if (!canDecide()) {
            return { ok: false, error: "Access denied." };
        }
        var nextState = lCase(trim(arguments.state));
        if (!listFindNoCase("approved,rejected,changes_requested", nextState)) {
            return { ok: false, error: "State must be approved, rejected, or changes_requested." };
        }
        var existing = queryExecute(
            "
                SELECT id, state
                FROM ai_responses
                WHERE id = CAST(:id AS uuid)
            ",
            { id: { value: arguments.responseId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        if (existing.recordCount == 0) {
            return { ok: false, error: "Answer was not found." };
        }
        if (toString(existing.state[1]) != "pending_review") {
            return { ok: false, error: "Only pending_review answers can be decided." };
        }
        queryExecute(
            "
                UPDATE ai_responses
                SET state = :state,
                    decided_by = CAST(:userId AS uuid),
                    decided_at = now()
                WHERE id = CAST(:id AS uuid)
            ",
            {
                state: { value: nextState, cfsqltype: "cf_sql_varchar" },
                userId: { value: session.userId, cfsqltype: "cf_sql_varchar" },
                id: { value: arguments.responseId, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        new idochive.AuditService().write("ask.decided", "ask", arguments.responseId, {
            responseId: arguments.responseId,
            state: nextState
        });
        return { ok: true, item: loadItem(arguments.responseId) };
    }

    public boolean function canDecide() {
        var auth = new idochive.AuthService();
        return auth.hasRole("records_officer")
            || auth.hasRole("approver")
            || auth.hasRole("security_admin");
    }

    private boolean function canSeeAllDepartments() {
        var auth = new idochive.AuthService();
        return auth.hasRole("security_admin") || auth.hasRole("auditor") || auth.hasRole("platform_operator");
    }

    private array function retrieveChunks(required string queryText) {
        var gateway = new idochive.ModelGateway();
        var qvec = gateway.vectorLiteral(repeatZero());
        var useVector = false;
        var embedded = gateway.embed(arguments.queryText, 15);
        if (embedded.ok) {
            qvec = gateway.vectorLiteral(embedded.vector);
            useVector = true;
        }
        var pattern = likePattern(focusTerms(arguments.queryText));
        var q = queryExecute(
            "
                WITH authorized AS (
                    SELECT d.id, d.title
                    FROM documents d
                    WHERE d.organization_id = CAST(:orgId AS uuid)
                      AND (
                          d.department_id = CAST(:deptId AS uuid)
                          OR :canSeeAll = true
                      )
                ),
                ranked AS (
                    SELECT c.id AS chunk_id, a.id AS document_id, a.title, c.content,
                           MIN(CASE WHEN :useVector = true THEN e.embedding <=> CAST(:qvec AS vector) ELSE 1 END) AS dist,
                           MAX(CASE
                               WHEN a.title ILIKE :pattern ESCAPE '\' THEN 1
                               WHEN c.content ILIKE :pattern ESCAPE '\' THEN 1
                               ELSE 0
                           END) AS kw
                    FROM authorized a
                    JOIN document_versions v ON v.document_id = a.id
                    JOIN document_chunks c ON c.document_version_id = v.id
                    LEFT JOIN chunk_embeddings e
                      ON e.chunk_id = c.id
                     AND e.model_version_id = CAST(:modelVersionId AS uuid)
                    WHERE length(trim(c.content)) > 0
                      AND (
                          a.title ILIKE :pattern ESCAPE '\'
                          OR c.content ILIKE :pattern ESCAPE '\'
                          OR (
                              :useVector = true
                              AND e.embedding IS NOT NULL
                              AND e.embedding <=> CAST(:qvec AS vector) < 0.42
                          )
                      )
                    GROUP BY c.id, a.id, a.title, c.content
                )
                SELECT chunk_id, document_id, title, content
                FROM ranked
                ORDER BY kw DESC, dist ASC
                LIMIT 5
            ",
            {
                orgId: { value: session.organizationId, cfsqltype: "cf_sql_varchar" },
                deptId: { value: session.departmentId, cfsqltype: "cf_sql_varchar", null: !len(session.departmentId ?: "") },
                canSeeAll: { value: canSeeAllDepartments(), cfsqltype: "cf_sql_bit" },
                pattern: { value: pattern, cfsqltype: "cf_sql_varchar" },
                useVector: { value: useVector, cfsqltype: "cf_sql_bit" },
                qvec: { value: qvec, cfsqltype: "cf_sql_varchar" },
                modelVersionId: { value: new idochive.EmbedService().currentModelVersionId(), cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        var rows = [];
        for (var row in q) {
            arrayAppend(rows, {
                chunkId: toString(row.chunk_id),
                documentId: toString(row.document_id),
                title: toString(row.title),
                content: toString(row.content)
            });
        }
        return rows;
    }

    private string function buildPrompt(required string question, required array chunks, string policyBody = "") {
        var sources = [];
        var i = 1;
        for (var chunk in arguments.chunks) {
            arrayAppend(sources, "[" & i & "] " & chunk.title & chr(10) & left(chunk.content, 800));
            i++;
        }
        var instructions = len(trim(arguments.policyBody))
            ? trim(arguments.policyBody)
            : "Answer only from the authorized sources below. If they are insufficient, say you cannot answer from authorized records. Do not invent sources or other departments.";
        return instructions
            & chr(10) & chr(10) & "Question: " & arguments.question
            & chr(10) & chr(10) & "Sources:" & chr(10) & arrayToList(sources, chr(10) & chr(10));
    }

    private string function extractiveAnswer(required array chunks) {
        var titles = [];
        for (var chunk in arguments.chunks) {
            arrayAppend(titles, chunk.title);
        }
        return "A generated answer is not available from the local model. Review these authorized records: " & arrayToList(titles, "; ") & ". This output stays pending_review.";
    }

    private struct function persist(
        required string question,
        required string answer,
        required string mode,
        required string modelVersionId,
        required array chunks
    ) {
        var req = queryExecute(
            "
                INSERT INTO ai_requests (actor_id, question)
                VALUES (CAST(:actorId AS uuid), :question)
                RETURNING id
            ",
            {
                actorId: { value: session.userId, cfsqltype: "cf_sql_varchar" },
                question: { value: arguments.question, cfsqltype: "cf_sql_longvarchar" }
            },
            { datasource: "idochive" }
        );
        var requestId = toString(req.id[1]);
        var res = queryExecute(
            "
                INSERT INTO ai_responses (request_id, answer, mode, model_version_id, state)
                VALUES (
                    CAST(:requestId AS uuid),
                    :answer,
                    :mode,
                    CAST(:modelVersionId AS uuid),
                    'pending_review'
                )
                RETURNING id
            ",
            {
                requestId: { value: requestId, cfsqltype: "cf_sql_varchar" },
                answer: { value: left(arguments.answer, 8000), cfsqltype: "cf_sql_longvarchar" },
                mode: { value: arguments.mode, cfsqltype: "cf_sql_varchar" },
                modelVersionId: { value: arguments.modelVersionId, cfsqltype: "cf_sql_varchar", null: !len(arguments.modelVersionId) }
            },
            { datasource: "idochive" }
        );
        var responseId = toString(res.id[1]);
        var rank = 1;
        for (var chunk in arguments.chunks) {
            queryExecute(
                "
                    INSERT INTO citations (response_id, document_id, chunk_id, rank)
                    VALUES (
                        CAST(:responseId AS uuid),
                        CAST(:documentId AS uuid),
                        CAST(:chunkId AS uuid),
                        :rank
                    )
                ",
                {
                    responseId: { value: responseId, cfsqltype: "cf_sql_varchar" },
                    documentId: { value: chunk.documentId, cfsqltype: "cf_sql_varchar" },
                    chunkId: { value: chunk.chunkId, cfsqltype: "cf_sql_varchar" },
                    rank: { value: rank, cfsqltype: "cf_sql_integer" }
                },
                { datasource: "idochive" }
            );
            rank++;
        }
        return { requestId: requestId, responseId: responseId };
    }

    private struct function loadItem(required string responseId) {
        var q = queryExecute(
            "
                SELECT r.id AS request_id, r.question, r.created_at,
                       s.id AS response_id, s.answer, s.mode, s.state
                FROM ai_responses s
                JOIN ai_requests r ON r.id = s.request_id
                WHERE s.id = CAST(:id AS uuid)
            ",
            { id: { value: arguments.responseId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        var cites = queryExecute(
            "
                SELECT c.document_id, c.rank, d.title
                FROM citations c
                JOIN documents d ON d.id = c.document_id
                WHERE c.response_id = CAST(:id AS uuid)
                ORDER BY c.rank
            ",
            { id: { value: arguments.responseId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        var citationRows = [];
        for (var row in cites) {
            arrayAppend(citationRows, {
                "documentId": toString(row.document_id),
                "title": toString(row.title),
                "rank": val(row.rank)
            });
        }
        return {
            "id": toString(q.response_id[1]),
            "requestId": toString(q.request_id[1]),
            "question": toString(q.question[1]),
            "answer": toString(q.answer[1]),
            "mode": toString(q.mode[1]),
            "state": toString(q.state[1]),
            "createdAt": toString(q.created_at[1]),
            "citations": citationRows
        };
    }

    private array function repeatZero() {
        var parts = [];
        var i = 0;
        for (i = 1; i <= 768; i++) {
            arrayAppend(parts, 0);
        }
        return parts;
    }

    private string function focusTerms(required string q) {
        var cleaned = rereplace(lCase(arguments.q), "[?!,.;:']", " ", "all");
        var stop = "what,is,are,was,were,the,a,an,of,for,to,in,on,please,tell,me,about,can,you,does,do,how,why";
        var kept = [];
        for (var part in listToArray(cleaned, " ")) {
            if (len(part) >= 3 && !listFindNoCase(stop, part)) {
                arrayAppend(kept, part);
            }
        }
        return arrayLen(kept) ? arrayToList(kept, " ") : arguments.q;
    }

    private string function likePattern(required string q) {
        var safe = replace(arguments.q, "\", "\\", "all");
        safe = replace(safe, "%", "\%", "all");
        safe = replace(safe, "_", "\_", "all");
        return "%" & safe & "%";
    }

    private string function currentGenerateModelVersionId() {
        return "77777777-7777-7777-7777-777777777777";
    }
}
