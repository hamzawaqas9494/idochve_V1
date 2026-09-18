# Unit 11 spec: Prompt policy, classification, and extraction

## Goal

Store ask, classify, and extract instructions as versioned prompt policies. Classification and extraction run off the HTTP thread and write `pending_review` results. No labeled eval set is invented. No accuracy figures are published.

Source: `idochive.md` Section 51 Release 2 (domain classification, structured extraction, prompt policy). Local generate only. No public AI API.

## Design

`PolicyService` loads the active `prompt_policy_versions.body` by policy code. `AskService` prepends `ask_grounded`. Classify and extract workers enqueue after OCR text is stored, then `POST /api/jobs/tick.cfm` processes OCR, embed, classify, then extract.

If local generate is unavailable, the job still writes a `pending_review` row that says generate was unavailable. It does not invent a class or fields and does not call a public API.

Approved classification may `UPDATE documents.class_id` using an existing class code. If that update is denied, the decision still stands on `classification_results`.

## In scope

- Seed policies: `ask_grounded`, `classify_document`, `extract_fields`
- Classify and extract job tables and results
- Reviewer decide APIs
- Intelligence review lists
- Audit `policy.used`, `classification.completed`, `extraction.completed`

## Out of scope

- Customer eval set and citation-correctness scores
- Published accuracy
- Arbitrary user prompt editing
- Public AI APIs
- Marketing website

## APIs

- `GET /api/policies.cfm` — active policies (code, version, no body required in list)
- `GET/POST /api/classifications.cfm` — list pending; `{ id, state }`
- `GET/POST /api/extractions.cfm` — list pending; `{ id, state }`
- `POST /api/jobs/tick.cfm` — also classify then extract

## Verify when this unit is done

- [x] Ask audit includes `policy.used` / policy version id
- [x] One classification result exists in `pending_review`
- [x] One extraction result stores JSON and can be decided
- [x] No public AI API is required
