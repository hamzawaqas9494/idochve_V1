# Unit 12 spec: Windows developer bootstrap

## Goal

A new Windows developer can prepare the marketing site and the local product pilot without copying SQL, `.env`, and npm steps by hand. One PowerShell script detects tools, optionally installs them, applies schema, builds the UIs, and starts CommandBox.

Source: local setup in the repository root `README.md`. Docker stays unused. Public AI APIs stay unused.

## Design

`scripts/setup-dev.ps1` is idempotent. Re-running it must not drop the database, overwrite an existing `.env`, or print secrets.

`-Install` may call `winget` for Node LTS, CommandBox, and PostgreSQL when those tools are missing. `-WithOcr` and `-WithModels` may install Tesseract and Ollama. `winget` does not reliably install **pgvector**. If `CREATE EXTENSION vector` fails, the script stops with a short message. It does not compile pgvector.

Creating the `idochive` role and database needs a reachable local superuser (`IDOCHIVE_DB_ADMIN_USER` / `IDOCHIVE_DB_ADMIN_PASSWORD`, or a working `postgres` login). If neither works, the script stops and tells the developer what to set. It never prints the password.

## In scope

- Detect Node 20+, CommandBox (`box` or `d:\box\box.exe`), `psql`
- Optional `winget` installs
- Copy `.env.example` files only when the destination is missing
- Apply `product/db/001` through `010`
- `npm install` at the repo root and `product/ui`; build the product UI
- Start CommandBox from the repo root and print the health URL

## Out of scope

- Docker Compose as the default
- Silent pgvector compile
- Production HA or air-gap bundles
- Committing `.env` or changing git config

## Commands

```powershell
pwsh -File scripts/setup-dev.ps1
pwsh -File scripts/setup-dev.ps1 -Install
pwsh -File scripts/setup-dev.ps1 -Install -WithOcr -WithModels
```

Windows PowerShell 5.1: replace `pwsh` with `powershell`.

## Verify when this unit is done

- [x] Re-run on a machine that already has tools does not drop data or overwrite `.env`
- [x] `GET /api/health.cfm` is reachable after start
- [x] README leads with the one command
- [x] No public AI API is required
