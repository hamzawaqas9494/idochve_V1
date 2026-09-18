# Unit 19 spec: Tick does not run OCR

## Goal

`POST /api/jobs/tick.cfm` must not run OCR, embed, classify, or extract on the HTTP request thread. It only marks the background `cfthread` to skip its idle wait.

## Behavior

- Authenticated. Roles that may tick: `records_officer`, `document_controller`, `approver`, `security_admin` (`JobService.canTick()`).
- Sets `application.tickRequested = true`.
- Returns `ok: true`, `processed: false`, `woken: true`, and a message that work runs in the background worker.
- `Application.cfc` worker loop still calls `JobWorker.processAvailable()` off the request thread.

## Out of scope

Moving OCR to Python. Removing `cfthread`. Changing job start-without-Redis (that path still exists on `jobs/control.cfm` start).
