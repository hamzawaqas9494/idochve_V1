# Delivery-team install (Windows pilot)

A delivery engineer can prepare the local pilot without the original developer. Docker is not required.

## Supported path

From a clone of this repository:

```powershell
pwsh -File scripts/setup-dev.ps1
```

Windows PowerShell 5.1: `powershell -File scripts/setup-dev.ps1`.

Missing tools: add `-Install`. Local OCR and models: add `-WithOcr -WithModels`. Public AI APIs are not used.

`-Install -WithOcr` installs Tesseract and downloads a pinned portable Poppler build under the gitignored
`product/tools/poppler-windows` folder. Poppler provides `pdftoppm`, which converts a PDF to temporary page images so
the OCR worker can report real `Reading page N of M` progress. Image OCR remains available when Poppler is absent;
PDF OCR reports a configuration error instead of fake progress.

For a pre-provisioned or air-gapped server, set the executable explicitly:

```env
IDOCHIVE_PDFTOPPM=D:\approved-tools\poppler\Library\bin\pdftoppm.exe
```

`winget` can install PostgreSQL. It cannot install **pgvector**. If `CREATE EXTENSION vector` fails, install pgvector on that PostgreSQL, then re-run.

The script does not overwrite an existing `product/app/.env` and does not drop the database.

Browser CORS is an allowlist (`IDOCHIVE_CORS_ORIGINS`). The API does not echo an arbitrary `Origin`. Pilot defaults include CommandBox (`:8080`) and the Vite UI proxy (`:5173`).

New originals are AES-GCM (`IDG1` prefix in `storage/blobs`). Older AES-ECB files still decrypt.

## After setup

- Product: `http://127.0.0.1:8080/`
- Health: `http://127.0.0.1:8080/api/health.cfm`
- Officer A: `records.officer@nia.example` / `ChangeMePilot!`
- Officer B (other department): `records.other@nia.example` / `ChangeMePilot!`
- Marketing site: `npm run dev` from the repository root

Permission proof:

```powershell
powershell -File scripts/permission-tests.ps1
```

Backup proof: `pwsh -File product/ops/restore-verify.ps1` (see `product/ops/README.md`).

## Air-gap note

Once CommandBox, PostgreSQL + pgvector, the UI build, and any local models are already on the machine, **running** this pilot does not require internet egress. `winget`, `npm install`, and `ollama pull` do need a network the first time they are used. Signed offline bundles are Release 4.

## Optional Compose

[`product/deploy/docker-compose.yml`](../deploy/docker-compose.yml) can start PostgreSQL + pgvector only. Encrypted originals stay on disk under `product/app/storage/blobs`. CommandBox on the host remains the application runtime. Compose is not the default path.
