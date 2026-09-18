component {

    public struct function callerAccess() {
        return {
            organizationId: session.organizationId,
            departmentId: session.departmentId ?: "",
            canSeeAll: canSeeAllDepartments(),
            canTick: canTick()
        };
    }

    public struct function listForUser(string filter = "all", struct access = {}) {
        var orgId = len(trim(arguments.access.organizationId ?: "")) ? arguments.access.organizationId : session.organizationId;
        var deptId = structKeyExists(arguments.access, "departmentId") ? arguments.access.departmentId : (session.departmentId ?: "");
        var seeAll = structKeyExists(arguments.access, "canSeeAll") ? arguments.access.canSeeAll : canSeeAllDepartments();
        var tickAllowed = structKeyExists(arguments.access, "canTick") ? arguments.access.canTick : canTick();
        var q = queryExecute(
            "
                WITH latest_version AS (
                    SELECT DISTINCT ON (v.document_id)
                           v.id, v.document_id, v.byte_size, v.mime_type
                    FROM document_versions v
                    ORDER BY v.document_id, v.version_number DESC
                ),
                latest_ingest AS (
                    SELECT DISTINCT ON (j.document_version_id)
                           j.id, j.document_version_id, j.status, j.error_text, j.created_at
                    FROM ingest_jobs j
                    ORDER BY j.document_version_id, j.created_at DESC
                ),
                latest_ocr AS (
                    SELECT DISTINCT ON (r.document_version_id)
                           r.document_version_id, r.status, r.language_code, r.mean_confidence
                    FROM ocr_results r
                    ORDER BY r.document_version_id, r.created_at DESC
                ),
                latest_class_job AS (
                    SELECT DISTINCT ON (j.document_version_id)
                           j.document_version_id, j.status
                    FROM classification_jobs j
                    ORDER BY j.document_version_id, j.created_at DESC
                ),
                latest_class AS (
                    SELECT DISTINCT ON (r.document_version_id)
                           r.document_version_id, r.state
                    FROM classification_results r
                    ORDER BY r.document_version_id, r.created_at DESC
                ),
                latest_extract_job AS (
                    SELECT DISTINCT ON (j.document_version_id)
                           j.document_version_id, j.status
                    FROM extraction_jobs j
                    ORDER BY j.document_version_id, j.created_at DESC
                ),
                latest_extract AS (
                    SELECT DISTINCT ON (r.document_version_id)
                           r.document_version_id, r.state
                    FROM extraction_results r
                    ORDER BY r.document_version_id, r.created_at DESC
                ),
                latest_task AS (
                    SELECT DISTINCT ON (t.document_id)
                           t.document_id, t.state
                    FROM workflow_tasks t
                    ORDER BY t.document_id, t.created_at DESC
                )
                SELECT d.id AS document_id, d.title,
                       lv.id AS version_id, lv.byte_size, lv.mime_type,
                       ij.id AS ingest_job_id, ij.status AS ingest_status, ij.error_text,
                       o.status AS ocr_status, o.language_code, o.mean_confidence,
                       cj.status AS class_job_status, cr.state AS class_state,
                       ej.status AS extract_job_status, er.state AS extract_state,
                       wt.state AS workflow_state,
                       jc.command AS control_command,
                       op.current_page, op.total_pages, op.elapsed_ms,
                       EXISTS (
                           SELECT 1 FROM document_chunks c
                           WHERE c.document_version_id = lv.id
                             AND length(trim(c.content)) > 0
                       ) AS has_chunk
                FROM documents d
                JOIN latest_version lv ON lv.document_id = d.id
                LEFT JOIN latest_ingest ij ON ij.document_version_id = lv.id
                LEFT JOIN latest_ocr o ON o.document_version_id = lv.id
                LEFT JOIN latest_class_job cj ON cj.document_version_id = lv.id
                LEFT JOIN latest_class cr ON cr.document_version_id = lv.id
                LEFT JOIN latest_extract_job ej ON ej.document_version_id = lv.id
                LEFT JOIN latest_extract er ON er.document_version_id = lv.id
                LEFT JOIN latest_task wt ON wt.document_id = d.id
                LEFT JOIN job_controls jc ON jc.document_id = d.id
                LEFT JOIN ocr_progress op ON op.ingest_job_id = ij.id
                WHERE d.organization_id = CAST(:orgId AS uuid)
                  AND (
                      d.department_id = CAST(:deptId AS uuid)
                      OR :canSeeAll = true
                  )
                  AND COALESCE(jc.command, 'active') <> 'removed'
                ORDER BY COALESCE(ij.created_at, d.created_at) DESC
                LIMIT 100
            ",
            {
                orgId: { value: orgId, cfsqltype: "cf_sql_varchar" },
                deptId: { value: deptId, cfsqltype: "cf_sql_varchar", null: !len(trim(toString(deptId))) },
                canSeeAll: { value: seeAll, cfsqltype: "cf_sql_bit" }
            },
            { datasource: "idochive" }
        );

        var items = [];
        var counts = { "active": 0, "review": 0, "ready": 0 };
        var wanted = lCase(trim(arguments.filter));
        if (!listFindNoCase("all,active,review,ready", wanted)) {
            wanted = "all";
        }
        for (var row in q) {
            var mapped = mapRow(row, tickAllowed);
            if (mapped.filterKey == "ready") {
                counts.ready++;
            } else if (mapped.filterKey == "review") {
                counts.review++;
            } else {
                counts.active++;
            }
            if (wanted == "all" || wanted == mapped.filterKey) {
                arrayAppend(items, mapped.item);
            }
        }
        var queue = {};
        try {
            queue = new idochive.JobQueue().status();
        } catch (any err) {
            queue = { "engine": "redis", "available": false, "depth": 0 };
        }
        return {
            "contractVersion": "1",
            "items": items,
            "counts": counts,
            "canTick": tickAllowed,
            "queue": queue
        };
    }

    public boolean function canTick() {
        var auth = new idochive.AuthService();
        return auth.hasRole("records_officer")
            || auth.hasRole("document_controller")
            || auth.hasRole("approver")
            || auth.hasRole("security_admin");
    }

    public string function progressFingerprint(required struct payload) {
        var parts = [];
        if (structKeyExists(arguments.payload, "counts")) {
            arrayAppend(parts, serializeJSON(arguments.payload.counts));
        }
        if (structKeyExists(arguments.payload, "items") && isArray(arguments.payload.items)) {
            for (var item in arguments.payload.items) {
                arrayAppend(parts, toString(item.documentId ?: "") & ":" & toString(item.state ?: "") & ":" & toString(item.currentPage ?: "") & ":" & toString(item.overallProgress ?: "") & ":" & toString(item.message ?: ""));
            }
        }
        return hash(arrayToList(parts, "|"), "MD5");
    }

    private struct function mapRow(required any row, boolean tickAllowed = true) {
        var ingest = lCase(toString(row.ingest_status ?: ""));
        var ocr = lCase(toString(row.ocr_status ?: ""));
        var classJob = lCase(toString(row.class_job_status ?: ""));
        var classState = lCase(toString(row.class_state ?: ""));
        var extractJob = lCase(toString(row.extract_job_status ?: ""));
        var extractState = lCase(toString(row.extract_state ?: ""));
        var workflow = lCase(toString(row.workflow_state ?: ""));
        var control = lCase(toString(row.control_command ?: "active"));
        var hasChunk = isTruthy(row.has_chunk);
        var ocrDone = listFindNoCase("accepted,corrected", ocr);
        var hasOcr = len(ocr) GT 0;
        var classDone = len(classState) GT 0;
        var extractDone = len(extractState) GT 0;
        var extractBusy = listFindNoCase("queued,running", extractJob) || extractState == "pending_review";
        var classBusy = listFindNoCase("queued,running", classJob) || classState == "pending_review" || (ocrDone && !classDone);
        var ready = (workflow == "approved")
            || (ocrDone && hasChunk && classDone && extractDone)
            || (ocrDone && hasChunk && !len(classJob) && !len(extractJob));
        var jobFailed = listFindNoCase("failed", classJob) || listFindNoCase("failed", extractJob);

        var state = "stored";
        var label = "Original secured";
        var message = "The encrypted original is stored.";
        var filterKey = "active";
        var nextAction = "";
        var currentPage = val(row.current_page ?: 0);
        var totalPages = val(row.total_pages ?: 0);
        var elapsedMs = val(row.elapsed_ms ?: 0);

        if (control == "paused") {
            state = "paused";
            label = "Paused";
            message = "Processing is paused. Use Start to resume.";
            nextAction = "start";
        } else if (control == "cancelled") {
            state = "cancelled";
            label = "Cancelled";
            message = "This job was ended. The encrypted original remains.";
            nextAction = "remove";
        } else if (ingest == "failed" || jobFailed) {
            state = "failed";
            label = "Action required";
            message = len(trim(toString(row.error_text ?: "")))
                ? toString(row.error_text)
                : "A processing step failed. Review the file and retry.";
            filterKey = "active";
        } else if (ready) {
            state = "approved";
            label = "Ready and searchable";
            message = "Approved content is indexed and available through search.";
            filterKey = "ready";
            nextAction = "download";
        } else if (ocr == "needs_validation") {
            state = "pending_review";
            label = "Needs validation";
            message = "OCR confidence is below the threshold or the text is empty.";
            filterKey = "review";
            nextAction = "validate";
        } else if (ingest == "running") {
            state = "ocr_processing";
            label = "Reading document";
            if (totalPages GT 0 && currentPage GT 0) {
                message = "Reading page " & currentPage & " of " & totalPages;
            } else if (totalPages GT 0) {
                message = "OCR started.";
            } else {
                message = "OCR is processing the secured original.";
            }
        } else if (ingest == "queued" || !hasOcr) {
            state = "queued";
            label = "Queued for OCR";
            message = "Waiting for the next OCR worker.";
        } else if (ocrDone && extractBusy) {
            state = "extracting";
            label = "Extracting information";
            message = "Fields are being prepared for review.";
        } else if (ocrDone && classBusy) {
            state = "classifying";
            label = "Identifying document";
            message = "iDocHive is detecting class and language.";
        } else if (ocrDone && hasChunk) {
            state = "approved";
            label = "Ready and searchable";
            message = "Text is stored and available through search.";
            filterKey = "ready";
            nextAction = "download";
        }

        var estimatedSeconds = "";
        var progress = 40;
        if (ready || state == "approved") {
            progress = 100;
        } else if (extractDone) {
            progress = 95;
        } else if (classDone) {
            progress = 85;
        } else if (hasOcr) {
            progress = 75;
        } else if (state == "ocr_processing" && totalPages GT 0) {
            progress = 40 + int((35 * currentPage) / totalPages);
            if (currentPage GTE 1 && currentPage LT totalPages && elapsedMs GT 0) {
                estimatedSeconds = int(((totalPages - currentPage) * elapsedMs) / currentPage / 1000);
            }
        }

        return {
            filterKey: filterKey,
            item: {
                "id": toString(row.ingest_job_id ?: row.document_id),
                "documentId": toString(row.document_id),
                "fileName": toString(row.title),
                "byteSize": val(row.byte_size),
                "state": state,
                "label": label,
                "message": message,
                "overallProgress": progress,
                "stageProgress": progress,
                "currentPage": totalPages GT 0 ? currentPage : javacast("null", ""),
                "totalPages": totalPages GT 0 ? totalPages : javacast("null", ""),
                "estimatedSeconds": isNumeric(estimatedSeconds) ? val(estimatedSeconds) : javacast("null", ""),
                "detectedLanguage": toString(row.language_code ?: ""),
                "confidence": len(toString(row.mean_confidence ?: "")) ? val(row.mean_confidence) : javacast("null", ""),
                "errorText": toString(row.error_text ?: ""),
                "workflowState": workflow,
                "filter": filterKey,
                "mimeType": toString(row.mime_type ?: ""),
                "allowedActions": allowedActions(state, ingest, control, nextAction, arguments.tickAllowed),
                "nextAction": nextAction
            }
        };
    }

    private array function allowedActions(required string state, required string ingest, required string control, required string nextAction, boolean tickAllowed = true) {
        var actions = [ "status" ];
        var canControl = arguments.tickAllowed;
        if (canControl && listFindNoCase("queued,running", arguments.ingest) && arguments.control == "active") {
            arrayAppend(actions, "pause");
        }
        if (canControl && (arguments.ingest == "queued" || arguments.control == "paused") && arguments.control != "cancelled") {
            arrayAppend(actions, "start");
        }
        if (canControl && (arguments.ingest == "queued" || arguments.ingest == "running" || arguments.ingest == "failed" || arguments.control == "paused") && arguments.control != "cancelled") {
            arrayAppend(actions, "cancel");
        }
        if (canControl && arguments.state != "approved" && arguments.state != "pending_review") {
            if (arguments.ingest == "queued" || arguments.ingest == "failed" || arguments.control == "paused" || arguments.control == "cancelled") {
                arrayAppend(actions, "remove");
            }
        }
        if (arguments.nextAction == "validate") {
            arrayAppend(actions, "validate");
        }
        if (arguments.nextAction == "download") {
            arrayAppend(actions, "download");
        }
        return actions;
    }

    private boolean function isTruthy(required any value) {
        if (isBoolean(arguments.value)) {
            return arguments.value;
        }
        return listFindNoCase("true,t,1,yes", toString(arguments.value)) GT 0;
    }

    private boolean function canSeeAllDepartments() {
        var auth = new idochive.AuthService();
        return auth.hasRole("security_admin") || auth.hasRole("auditor") || auth.hasRole("platform_operator");
    }
}
