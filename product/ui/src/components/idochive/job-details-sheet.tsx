import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { TIMELINE, formatEta, statusLabel } from "@/lib/ingestion/status-map";
import type { IngestionJob, ProcessingState } from "@/lib/ingestion/types";
import { cn } from "@/lib/utils";

const order: ProcessingState[] = ["stored", "queued", "ocr_processing", "classifying", "pending_review", "approved"];

export function JobDetailsSheet({
  job,
  open,
  onOpenChange,
  onAudit,
  onView,
}: {
  job: IngestionJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAudit: () => void;
  onView: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetTitle>Job details</SheetTitle>
        <SheetDescription>{job?.fileName ?? "Processing timeline"}</SheetDescription>
        {job ? (
          <ScrollArea className="mt-5 h-[calc(100dvh-8rem)]">
            <ol className="m-0 grid list-none gap-3 p-0">
              {TIMELINE.map((step, index) => {
                const reached = timelineReached(job.state, index);
                const current = isCurrentStep(job.state, index);
                return (
                  <li key={step.id} className="flex gap-3">
                    <span
                      className={cn(
                        "mt-1 size-2.5 rounded-full",
                        current && "bg-[var(--blue-600)] animate-pulse motion-reduce:animate-none",
                        reached && !current && "bg-[var(--success)]",
                        !reached && "bg-[var(--border)]",
                      )}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="m-0 text-sm font-medium">{step.label}</p>
                      {current ? <p className="m-0 text-xs text-[var(--muted)]">{job.message}</p> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
            <Separator className="my-5" />
            <dl className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
              <dt className="text-[var(--muted)]">Status</dt>
              <dd className="m-0">{statusLabel[job.state]}</dd>
              <dt className="text-[var(--muted)]">Job ID</dt>
              <dd className="m-0 truncate font-mono text-xs">{job.id}</dd>
              <dt className="text-[var(--muted)]">Document ID</dt>
              <dd className="m-0 truncate font-mono text-xs">{job.documentId ?? "Pending"}</dd>
              <dt className="text-[var(--muted)]">File owner</dt>
              <dd className="m-0">{job.owner ?? "—"}</dd>
              <dt className="text-[var(--muted)]">Upload source</dt>
              <dd className="m-0">{job.source ?? "—"}</dd>
              <dt className="text-[var(--muted)]">Destination</dt>
              <dd className="m-0">{job.destination ?? "Your department collection"}</dd>
              <dt className="text-[var(--muted)]">Detected language</dt>
              <dd className="m-0">{job.language ?? "Detecting"}</dd>
              <dt className="text-[var(--muted)]">OCR engine</dt>
              <dd className="m-0">{job.engine ?? "Tesseract"}</dd>
              <dt className="text-[var(--muted)]">Size</dt>
              <dd className="m-0">{job.size}</dd>
              <dt className="text-[var(--muted)]">Page count</dt>
              <dd className="m-0">{job.totalPages ?? job.pages ?? "—"}</dd>
              <dt className="text-[var(--muted)]">Confidence</dt>
              <dd className="m-0">{job.confidence != null ? `${job.confidence.toFixed(1)}` : "—"}</dd>
              <dt className="text-[var(--muted)]">Estimated completion</dt>
              <dd className="m-0">{formatEta(job.estimatedSeconds)}</dd>
            </dl>
            {job.errorText ? <p className="mt-4 text-sm text-[var(--danger)]">{job.errorText}</p> : null}
            <div className="mt-5 grid gap-2">
              <Button type="button" variant="outline" onClick={onView} disabled={!job.documentId}>
                Open viewer
              </Button>
              <Button type="button" variant="outline" onClick={onAudit} disabled={!job.documentId}>
                View audit events
              </Button>
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function timelineReached(state: ProcessingState, index: number) {
  const normalized =
    state === "uploading" || state === "verifying" || state === "selected"
      ? "stored"
      : state === "extracting"
        ? "classifying"
        : state;
  const current = Math.max(0, order.indexOf(normalized as ProcessingState));
  return index <= current;
}

function isCurrentStep(state: ProcessingState, index: number) {
  if (state === "ocr_processing") return index === 2;
  if (state === "classifying" || state === "extracting") return index === 3;
  if (state === "pending_review") return index === 4;
  if (state === "approved") return index === 5;
  return index === 0;
}
