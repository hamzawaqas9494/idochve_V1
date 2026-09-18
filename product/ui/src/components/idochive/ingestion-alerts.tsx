import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { SUPPORTED_SUMMARY } from "@/lib/ingestion/files";

export type IngestionAlert = "formats" | "unsupported" | "duplicate" | "upload-failed" | null;

export function IngestionAlerts({
  kind,
  detail,
  onClose,
}: {
  kind: IngestionAlert;
  detail?: string;
  onClose: () => void;
}) {
  const copy = copies[kind ?? "formats"];

  return (
    <Dialog open={Boolean(kind)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>{copy.body}</DialogDescription>
        {detail ? <p className="mt-3 max-h-40 overflow-auto text-sm text-[var(--muted)]">{detail}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NetworkAlert({ message }: { message: string }) {
  if (!message) return null;
  return <Alert variant="warning">{message}</Alert>;
}

const copies: Record<Exclude<IngestionAlert, null>, { title: string; body: string }> = {
  formats: {
    title: "Supported formats",
    body: `${SUPPORTED_SUMMARY}. Office files, email exports, and ZIP batches are not processed yet, so they are not accepted. Processing stays inside your environment.`,
  },
  unsupported: {
    title: "Some files were skipped.",
    body: `Only ${SUPPORTED_SUMMARY.toLowerCase()} can be processed today. These files were not uploaded.`,
  },
  duplicate: {
    title: "An identical original already exists.",
    body: "Every file receives a checksum. Open the existing record instead of storing a second copy.",
  },
  "upload-failed": {
    title: "Some uploads did not finish.",
    body: "The originals below were not stored. Retry them from the row menu when the problem is resolved.",
  },
};
