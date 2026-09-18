import { ShieldCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";

export function IngestionHeader() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h1 className="m-0 text-2xl font-semibold tracking-tight">Ingestion Center</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Upload once. iDocHive secures, reads, classifies, and routes every document for the right next action.
        </p>
      </div>
      <Alert variant="success" className="max-w-sm">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="m-0 font-medium">Processing inside your environment</p>
          <p className="m-0 mt-1 text-xs text-[var(--success)]/80">Your data stays secure and in your control.</p>
        </div>
      </Alert>
    </div>
  );
}
