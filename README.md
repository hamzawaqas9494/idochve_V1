# iDocHive

iDocHive is Creation Next’s governed enterprise document and knowledge intelligence platform. It is sold for customer-controlled on-premise, private, sovereign-cloud, or air-gapped deployment. It is not a public multi-tenant SaaS product.

> Your documents. Your data. Your private intelligence.

This repository holds two things:

| Path | What it is |
| --- | --- |
| Repository root | Marketing website for [idochive.com](https://idochive.com) (Vite + React) |
| [`product/`](product/) | The real application (ColdFusion + React + PostgreSQL + pgvector) |

There is no public signup. Do not treat `templates/` as product requirements. Product truth is [`idochive.md`](idochive.md).

---

## Requirements for developers

Install only what you are running.

### Everyone

- Git
- Node.js 20 or later and npm
- A code editor

### Marketing website only

The items above are enough. No database and no CommandBox.

### Product application (local pilot)

- CommandBox with Lucee 6 (`box` on your `PATH`, or `d:\box\box.exe` on this workstation)
- PostgreSQL 16 or later with the `vector`, `pgcrypto`, and `citext` extensions
- PowerShell 7 if you will run backup or restore scripts

Optional, but needed for the matching feature:

| Feature | Local dependency |
| --- | --- |
| OCR | Tesseract with `eng` and `ara` traineddata |
| Hybrid search / embeddings | [Ollama](https://ollama.com) with `nomic-embed-text` |
| Generated answers, classify, extract | Ollama with `qwen2.5:3b` |

Public AI APIs are not required and must not be configured as a fallback.

Windows is the verified local path. Linux or macOS can run the same stack; CommandBox and PostgreSQL installers differ.

---

## Requirements for companies

These are deployment and operating requirements, not a price list. Do not publish customer names, revenue, or accuracy figures from this file.

### Fit

iDocHive is for government agencies, regulated enterprises, archives, construction and infrastructure programs, and other security-first organizations. It is not for students, individual users, or public self-service signup.

ISO 9001 and ISO 27001 are held. ISO 42001 is in progress. Alignment with Saudi PDPL, NCA ECC, or other control sets is a deployment target. It is not an automatic declaration of customer compliance.

### What the customer controls

- Documents, models, keys, prompts, responses, and audit events stay inside the customer boundary
- On-premise, private customer infrastructure, sovereign cloud, and air-gapped patterns are supported
- Production must not depend on a public AI API
- High-impact AI and workflow outputs stay `pending_review` until an authorized human decides
- RBAC is enforced in the API and retrieval queries, not only in the UI

### What the customer must provide

- Named users and an organization / department structure (pilot uses local email and password; SAML or OIDC is Release 3)
- Customer-controlled compute, PostgreSQL, and object or file storage for encrypted originals
- Backup and restore ownership on the customer topology
- A labeled evaluation set on the customer’s own document types before Release 2 citation-correctness is claimed
- Hardware, scanners, and mass digitization as separate line items from software

### What this pilot does not yet include

- Production SAML / OIDC and directory integration
- SIEM connector and high-availability profiles
- Signed air-gap update bundles and two-site disaster recovery
- A published OCR or classification accuracy number

---

## One-command setup (Windows)

From a clone of this repository:

```powershell
pwsh -File scripts/setup-dev.ps1
```

Windows PowerShell 5.1 also works: `powershell -File scripts/setup-dev.ps1`.

That script copies missing `.env` files, applies all ordered migrations under `product/db` (currently `001`–`013`),
installs npm dependencies, builds the product UI, and starts CommandBox at `http://127.0.0.1:8080/`. It does not
overwrite an existing `.env` or drop the database. It never prints passwords.

If Node, CommandBox, or PostgreSQL are missing:

```powershell
pwsh -File scripts/setup-dev.ps1 -Install
```

Optional engines (still local; no public AI API):

```powershell
pwsh -File scripts/setup-dev.ps1 -Install -WithOcr -WithModels
```

`winget` can install PostgreSQL. It cannot install **pgvector**. If `CREATE EXTENSION vector` fails, install pgvector on that server and re-run. See [`product/specs/12-dev-setup.md`](product/specs/12-dev-setup.md).

After setup, the marketing site is `npm run dev` from the repository root. The product is `http://127.0.0.1:8080/` (pilot users below). Delivery-team notes: [`product/docs/install.md`](product/docs/install.md).

Manual steps remain if you prefer not to use the script.

---

## Set up the marketing website

From the repository root:

```powershell
copy .env.example .env
npm install
npm run dev
```

Open the URL Vite prints (usually `http://127.0.0.1:5173/`).

| Variable | Purpose |
| --- | --- |
| `VITE_SITE_URL` | Canonical origin for SEO tags. Default in `.env.example` is `https://idochive.com` |
| `VITE_FORM_ENDPOINT` | Qualification form POST target. Leave empty to keep the form disabled |

```powershell
npm run build
npm run preview
```

The website has no login and no product database.

---

## Set up the product locally (manual fallback)

Prefer `pwsh -File scripts/setup-dev.ps1` above. CommandBox is the supported runtime. Docker is not required. Optional Compose starts PostgreSQL + pgvector only ([`product/deploy/docker-compose.yml`](product/deploy/docker-compose.yml)); blobs stay on disk.

### 1. PostgreSQL

Create a database and role named `idochive`. Enable extensions by running the SQL files in order:

```text
product/db/001_extensions.sql
product/db/002_identity.sql
product/db/003_documents.sql
product/db/004_ocr.sql
product/db/005_approval.sql
product/db/006_backup.sql
product/db/007_embeddings.sql
product/db/008_hybrid_search.sql
product/db/009_ask.sql
product/db/010_policies.sql
product/db/011_permission_fixtures.sql
product/db/012_job_controls.sql
product/db/013_ocr_progress.sql
```

Default connection when you do not override `.env`:

- Host: `127.0.0.1`
- Port: `5432`
- Database / user: `idochive`
- Password: `idochive_dev_only`

### 2. Application environment

```powershell
copy product\app\.env.example product\app\.env
```

Set at least `IDOCHIVE_DB_PASSWORD` to match your local role. Leave `IDOCHIVE_BLOB_KEY` empty only on a throwaway workstation; the pilot encrypts originals under `product/app/storage/blobs`.

Useful variables:

| Variable | Purpose |
| --- | --- |
| `IDOCHIVE_DB_HOST` / `PORT` / `NAME` / `USER` / `PASSWORD` | PostgreSQL |
| `IDOCHIVE_TESSERACT` | Full path to `tesseract.exe` if it is not in the default install location |
| `IDOCHIVE_OLLAMA` | Ollama base URL. Default `http://127.0.0.1:11434` |
| `IDOCHIVE_EMBED_MODEL` | Default `nomic-embed-text` (768 dimensions) |
| `IDOCHIVE_GENERATE_MODEL` | Default `qwen2.5:3b` |

Do not commit `.env`.

### 3. Product UI

```powershell
cd product\ui
npm install
npm run build
```

The build writes into `product/app/www/` and is served by CommandBox at `/`.

### 4. Start CommandBox

From the repository root, using [`server.json`](server.json) (`webroot` = `product/app`, HTTP port `8080`):

```powershell
box server start
```

If `box` is not on `PATH`:

```powershell
d:\box\box.exe server start
```

Open `http://127.0.0.1:8080/`.

Health (no login): `http://127.0.0.1:8080/api/health.cfm`

Pilot users (password `ChangeMePilot!`):

- `records.officer@nia.example` — Project Controls (`records_officer`, `approver`)
- `records.other@nia.example` — Other Controls (`records_officer`)

### 5. Optional engines

OCR:

```powershell
# Installs Tesseract and portable Poppler for page-level PDF OCR
pwsh -File scripts/setup-dev.ps1 -Install -WithOcr
# Health should report ocr.available = true
# Health should report ocr.rasterizer.available = true for PDFs
```

Embeddings and generate (after Ollama is running):

```powershell
ollama pull nomic-embed-text
ollama pull qwen2.5:3b
```

Ask the background worker to take the next queued job (does not run OCR in the HTTP request):

```http
POST http://127.0.0.1:8080/api/jobs/tick.cfm
```

You must be logged in. Tick does not call a public AI API and does not run OCR on the request thread.

### 6. Backup (pilot)

```powershell
pwsh -File product/ops/backup.ps1
pwsh -File product/ops/restore-verify.ps1
```

Live replace requires an explicit confirmation phrase. See [`product/ops/README.md`](product/ops/README.md).

---

## Repository map

```text
idochive.md                 Product source of truth
src/                        Marketing site
context/                    Website agent context
product/app/                ColdFusion APIs and CommandBox webroot
product/ui/                 Product React source
product/db/                 PostgreSQL + pgvector SQL
product/ops/                Backup and restore-verify
product/specs/              Product unit specs
product/context/            Product agent context
```

---

## Documentation for agents and delivery

1. [`idochive.md`](idochive.md) — claims, architecture, confidentiality
2. [`product/AGENTS.md`](product/AGENTS.md) — product track rules
3. [`product/context/architecture.md`](product/context/architecture.md) — stack override (ColdFusion + React, not Laravel + Vue)
4. [`product/specs/00-build-plan.md`](product/specs/00-build-plan.md) — unit order
5. [`AGENTS.md`](AGENTS.md) — marketing-site track rules

Do not invent customers, prices, partnerships, or performance claims. Do not copy Ghost AI, Clerk, Next.js, or signup patterns from older playbooks.
