import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { IngestionJob, JobAction } from "@/lib/ingestion/types";

export function JobActions({
  job,
  onDetails,
  onReview,
  onView,
  onDownload,
  onAction,
  onAudit,
}: {
  job: IngestionJob;
  onDetails: () => void;
  onReview: () => void;
  onView: () => void;
  onDownload: () => void;
  onAction: (action: JobAction) => void;
  onAudit: () => void;
}) {
  const allowed = job.allowedActions ?? [];
  const canPause = !job.isLocal && allowed.includes("pause");
  const canStart = !job.isLocal && allowed.includes("start");
  const canCancel = job.isLocal ? job.state === "uploading" || job.state === "selected" : allowed.includes("cancel");
  const canRemove = !job.isLocal && allowed.includes("remove");
  const canRetry = job.state === "failed" || job.state === "blocked";
  const canValidate = job.state === "pending_review";
  const canDownload = !job.isLocal && allowed.includes("download");

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {job.documentId ? (
        <Button type="button" variant="outline" size="sm" onClick={onView}>
          View record
        </Button>
      ) : null}
      {canValidate ? (
        <Button type="button" variant="outline" size="sm" onClick={onReview}>
          Review
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label={`Actions for ${job.fileName}`}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onDetails}>View details</DropdownMenuItem>
          {job.documentId ? <DropdownMenuItem onSelect={onView}>Open viewer</DropdownMenuItem> : null}
          {canDownload ? <DropdownMenuItem onSelect={onDownload}>Download original</DropdownMenuItem> : null}
          {canPause ? <DropdownMenuItem onSelect={() => onAction("pause")}>Pause</DropdownMenuItem> : null}
          {canStart ? <DropdownMenuItem onSelect={() => onAction("start")}>Start</DropdownMenuItem> : null}
          {canCancel ? <DropdownMenuItem onSelect={() => onAction("cancel")}>Cancel</DropdownMenuItem> : null}
          {canRetry ? <DropdownMenuItem onSelect={() => onAction("retry")}>Retry</DropdownMenuItem> : null}
          {canRemove ? <DropdownMenuItem onSelect={() => onAction("remove")}>Remove</DropdownMenuItem> : null}
          {canValidate ? <DropdownMenuItem onSelect={onReview}>Open validation</DropdownMenuItem> : null}
          {job.documentId ? <DropdownMenuItem onSelect={onAudit}>View audit trail</DropdownMenuItem> : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
