component {

    public struct function processNext() {
        var claimed = claimJob();
        if (!claimed.ok) {
            return claimed;
        }
        return processClaimed(claimed);
    }

    public struct function processDocument(required string documentId) {
        var claimed = claimDocument(arguments.documentId);
        if (!claimed.ok) {
            return claimed;
        }
        return processClaimed(claimed);
    }

    private struct function processClaimed(required struct claimed) {
        var ingest = new idochive.IngestService();
        var gateway = new idochive.OcrGateway();
        var raster = new idochive.PdfRasterizer();
        var tempPath = "";
        var pageDir = "";
        try {
            var meta = loadVersion(arguments.claimed.versionId);
            tempPath = ingest.decryptToTemp(meta.blobKey, meta.mimeType);
            var pages = preparePages(tempPath, meta.mimeType, meta.fileName, raster);
            if (!pages.ok) {
                return failClaimed(arguments.claimed, pages.error);
            }
            pageDir = pages.dir;
            upsertProgress(arguments.claimed.jobId, arguments.claimed.documentId, 0, arrayLen(pages.files), 0);

            var texts = [];
            var confSum = 0;
            var confCount = 0;
            var elapsedMs = 0;
            var pageIndex = 0;
            for (var pagePath in pages.files) {
                pageIndex++;
                var halted = haltIfControlled(arguments.claimed);
                if (halted.stop) {
                    return halted.result;
                }
                var started = getTickCount();
                var ocr = gateway.recognize(pagePath, meta.languageCode);
                elapsedMs += getTickCount() - started;
                if (!ocr.ok) {
                    return failClaimed(arguments.claimed, "OCR stopped on page " & pageIndex & ". " & ocr.error);
                }
                if (len(trim(ocr.text))) {
                    arrayAppend(texts, ocr.text);
                }
                if (val(ocr.meanConfidence) > 0) {
                    confSum += val(ocr.meanConfidence);
                    confCount++;
                }
                upsertProgress(arguments.claimed.jobId, arguments.claimed.documentId, pageIndex, arrayLen(pages.files), elapsedMs);
            }

            var combined = {
                text: arrayToList(texts, chr(10)),
                meanConfidence: confCount ? (confSum / confCount) : 0
            };
            var needsReview = !len(trim(combined.text)) || val(combined.meanConfidence) < 70;
            var resultStatus = needsReview ? "needs_validation" : "accepted";
            var resultId = insertResult(arguments.claimed.versionId, meta.languageCode, combined, resultStatus);
            if (!needsReview) {
                writeChunk(arguments.claimed.versionId, combined.text);
                new idochive.EmbedService().enqueueForVersion(arguments.claimed.versionId);
                new idochive.PolicyService().enqueueForVersion(arguments.claimed.documentId, arguments.claimed.versionId);
            }
            completeJob(arguments.claimed.jobId);
            new idochive.AuditService().write(
                needsReview ? "ocr.needs_validation" : "ocr.completed",
                "document",
                arguments.claimed.documentId,
                {
                    jobId: arguments.claimed.jobId,
                    resultId: resultId,
                    meanConfidence: combined.meanConfidence,
                    pages: arrayLen(pages.files),
                    engine: "tesseract"
                }
            );
            return {
                "ok": true,
                "processed": true,
                "jobId": arguments.claimed.jobId,
                "status": resultStatus,
                "resultId": resultId
            };
        } catch (any err) {
            return failClaimed(arguments.claimed, err.message);
        } finally {
            ingest.deleteTemp(tempPath);
            raster.deleteDir(pageDir);
        }
    }

    private struct function preparePages(
        required string tempPath,
        required string mimeType,
        required string fileName,
        required any raster
    ) {
        if (isPdf(arguments.mimeType, arguments.fileName, arguments.tempPath)) {
            return arguments.raster.rasterize(arguments.tempPath);
        }
        return { ok: true, files: [ arguments.tempPath ], dir: "", error: "" };
    }

    private boolean function isPdf(required string mimeType, required string fileName, required string path) {
        if (findNoCase("pdf", arguments.mimeType)) {
            return true;
        }
        return right(lCase(arguments.fileName), 4) == ".pdf"
            || right(lCase(arguments.path), 4) == ".pdf";
    }

    private struct function haltIfControlled(required struct claimed) {
        var command = controlCommand(arguments.claimed.documentId);
        if (command == "paused") {
            requeueJob(arguments.claimed.jobId);
            return {
                stop: true,
                result: {
                    "ok": true,
                    "processed": true,
                    "jobId": arguments.claimed.jobId,
                    "status": "paused"
                }
            };
        }
        if (command == "cancelled" || command == "removed") {
            return { stop: true, result: failClaimed(arguments.claimed, "OCR stopped because the job was ended.") };
        }
        return { stop: false, result: {} };
    }

    private string function controlCommand(required string documentId) {
        var q = queryExecute(
            "SELECT command FROM job_controls WHERE document_id = CAST(:documentId AS uuid)",
            { documentId: { value: arguments.documentId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        if (q.recordCount == 0) {
            return "active";
        }
        return lCase(toString(q.command[1]));
    }

    private void function upsertProgress(
        required string jobId,
        required string documentId,
        required numeric currentPage,
        required numeric totalPages,
        required numeric elapsedMs
    ) {
        queryExecute(
            "
                INSERT INTO ocr_progress (
                    ingest_job_id, document_id, current_page, total_pages, elapsed_ms, started_at, updated_at
                ) VALUES (
                    CAST(:jobId AS uuid), CAST(:documentId AS uuid), :currentPage, :totalPages, :elapsedMs, now(), now()
                )
                ON CONFLICT (ingest_job_id)
                DO UPDATE SET
                    current_page = EXCLUDED.current_page,
                    total_pages = EXCLUDED.total_pages,
                    elapsed_ms = EXCLUDED.elapsed_ms,
                    updated_at = now()
            ",
            {
                jobId: { value: arguments.jobId, cfsqltype: "cf_sql_varchar" },
                documentId: { value: arguments.documentId, cfsqltype: "cf_sql_varchar" },
                currentPage: { value: arguments.currentPage, cfsqltype: "cf_sql_integer" },
                totalPages: { value: arguments.totalPages, cfsqltype: "cf_sql_integer" },
                elapsedMs: { value: arguments.elapsedMs, cfsqltype: "cf_sql_integer" }
            },
            { datasource: "idochive" }
        );
    }

    private void function requeueJob(required string jobId) {
        queryExecute(
            "
                UPDATE ingest_jobs
                SET status = 'queued', started_at = NULL, error_text = NULL
                WHERE id = CAST(:jobId AS uuid)
            ",
            { jobId: { value: arguments.jobId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
    }

    private struct function failClaimed(required struct claimed, required string errorText) {
        failJob(arguments.claimed.jobId, arguments.errorText);
        new idochive.AuditService().write("ocr.failed", "document", arguments.claimed.documentId, {
            jobId: arguments.claimed.jobId,
            error: arguments.errorText
        });
        return { "ok": false, "processed": true, "error": arguments.errorText, "jobId": arguments.claimed.jobId };
    }

    private struct function claimJob() {
        var q = queryExecute(
            "
                UPDATE ingest_jobs
                SET status = 'running', started_at = now()
                WHERE id = (
                    SELECT j.id
                    FROM ingest_jobs j
                    WHERE j.status = 'queued'
                      AND j.document_id NOT IN (
                          SELECT document_id FROM job_controls
                          WHERE command IN ('paused', 'cancelled', 'removed')
                      )
                    ORDER BY CASE WHEN EXISTS (
                        SELECT 1 FROM job_controls c
                        WHERE c.document_id = j.document_id AND c.run_next = true
                    ) THEN 0 ELSE 1 END, j.created_at ASC
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                )
                RETURNING id, document_id, document_version_id
            ",
            {},
            { datasource: "idochive" }
        );
        return finishClaim(q, "No queued OCR jobs.");
    }

    private struct function claimDocument(required string documentId) {
        var q = queryExecute(
            "
                UPDATE ingest_jobs
                SET status = 'running', started_at = now()
                WHERE id = (
                    SELECT j.id
                    FROM ingest_jobs j
                    WHERE j.status = 'queued'
                      AND j.document_id = CAST(:documentId AS uuid)
                      AND j.document_id NOT IN (
                          SELECT document_id FROM job_controls
                          WHERE command IN ('paused', 'cancelled', 'removed')
                      )
                    ORDER BY j.created_at DESC
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                )
                RETURNING id, document_id, document_version_id
            ",
            { documentId: { value: arguments.documentId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        return finishClaim(q, "That document is not queued for OCR.");
    }

    private struct function finishClaim(required query q, required string emptyMessage) {
        if (arguments.q.recordCount == 0) {
            return { "ok": false, "processed": false, "error": arguments.emptyMessage };
        }
        var documentId = toString(arguments.q.document_id[1]);
        queryExecute(
            "UPDATE job_controls SET run_next = false WHERE document_id = CAST(:documentId AS uuid)",
            { documentId: { value: documentId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        return {
            ok: true,
            jobId: toString(arguments.q.id[1]),
            documentId: documentId,
            versionId: toString(arguments.q.document_version_id[1])
        };
    }

    private struct function loadVersion(required string versionId) {
        var q = queryExecute(
            "
                SELECT v.blob_key, v.mime_type, d.language_code, d.title
                FROM document_versions v
                JOIN documents d ON d.id = v.document_id
                WHERE v.id = CAST(:versionId AS uuid)
            ",
            { versionId: { value: arguments.versionId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
        if (q.recordCount == 0) {
            throw(type="Ocr.VersionMissing", message="Document version was not found.");
        }
        return {
            blobKey: toString(q.blob_key[1]),
            mimeType: toString(q.mime_type[1]),
            languageCode: toString(q.language_code[1]),
            fileName: toString(q.title[1])
        };
    }

    private string function insertResult(
        required string versionId,
        required string languageCode,
        required struct ocr,
        required string resultStatus
    ) {
        var q = queryExecute(
            "
                INSERT INTO ocr_results (
                    document_version_id, engine, language_code,
                    mean_confidence, text_content, status
                ) VALUES (
                    CAST(:versionId AS uuid), 'tesseract', :lang,
                    :confidence, :text, :status
                )
                RETURNING id
            ",
            {
                versionId: { value: arguments.versionId, cfsqltype: "cf_sql_varchar" },
                lang: { value: arguments.languageCode, cfsqltype: "cf_sql_varchar" },
                confidence: { value: arguments.ocr.meanConfidence, cfsqltype: "cf_sql_decimal" },
                text: { value: arguments.ocr.text, cfsqltype: "cf_sql_longvarchar" },
                status: { value: arguments.resultStatus, cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
        return toString(q.id[1]);
    }

    private void function writeChunk(required string versionId, required string text) {
        if (!len(trim(arguments.text))) {
            return;
        }
        queryExecute(
            "
                INSERT INTO document_chunks (document_version_id, chunk_index, content)
                VALUES (CAST(:versionId AS uuid), 0, :content)
                ON CONFLICT (document_version_id, chunk_index)
                DO UPDATE SET content = EXCLUDED.content
            ",
            {
                versionId: { value: arguments.versionId, cfsqltype: "cf_sql_varchar" },
                content: { value: arguments.text, cfsqltype: "cf_sql_longvarchar" }
            },
            { datasource: "idochive" }
        );
    }

    private void function completeJob(required string jobId) {
        queryExecute(
            "
                UPDATE ingest_jobs
                SET status = 'completed', finished_at = now(), error_text = NULL
                WHERE id = CAST(:jobId AS uuid)
            ",
            { jobId: { value: arguments.jobId, cfsqltype: "cf_sql_varchar" } },
            { datasource: "idochive" }
        );
    }

    private void function failJob(required string jobId, required string errorText) {
        queryExecute(
            "
                UPDATE ingest_jobs
                SET status = 'failed', finished_at = now(), error_text = :errorText
                WHERE id = CAST(:jobId AS uuid)
            ",
            {
                jobId: { value: arguments.jobId, cfsqltype: "cf_sql_varchar" },
                errorText: { value: left(arguments.errorText, 2000), cfsqltype: "cf_sql_varchar" }
            },
            { datasource: "idochive" }
        );
    }
}
