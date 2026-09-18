# iDocHive Product

This folder is the **real iDocHive application**. It is not the marketing website.

For company requirements and the full manual fallback, use the repository root [`README.md`](../README.md).

## Stack

- Experience: React (built into `product/app/www`)
- Application and policy: ColdFusion on CommandBox (Lucee 6)
- Database: PostgreSQL + pgvector on `127.0.0.1`

Laravel is not used. Docker is not required.

## Quick start (Windows)

From the repository root:

```powershell
pwsh -File scripts/setup-dev.ps1
```

Windows PowerShell 5.1: `powershell -File scripts/setup-dev.ps1`.

Missing tools: add `-Install`. OCR and local models: add `-WithOcr -WithModels`. `winget` does not install pgvector.

Then open `http://127.0.0.1:8080/` and `http://127.0.0.1:8080/api/health.cfm`.

Pilot users (`ChangeMePilot!`): `records.officer@nia.example` and `records.other@nia.example` (other department).

Delivery install: [`docs/install.md`](docs/install.md). Permission proof: `powershell -File scripts/permission-tests.ps1`.

There is no public signup. Public AI APIs are not required.
