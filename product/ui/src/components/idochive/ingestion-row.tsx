import { Archive, FileSpreadsheet, FileText, Image, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import { JobActions } from "@/components/idochive/job-actions";
import { JobEta, JobProgress } from "@/components/idochive/job-progress";
import { JobStatus } from "@/components/idochive/job-status";
import type { FileKind, IngestionJob, JobAction } from "@/lib/ingestion/types";
import { cn } from "@/lib/utils";

const iconFor: Record<FileKind, typeof FileText> = {
  pdf: FileText,
  office: FileSpreadsheet,
  image: Image,
  archive: Archive,
  email: Mail,
  other: FileText,
};

const iconTone: Record<FileKind, string> = {
  pdf: "bg-[var(--danger)]/10 text-[var(--danger)]",
  office: "bg-[var(--success)]/10 text-[var(--success)]",
  image: "bg-[var(--amber)]/10 text-[var(--amber)]",
  archive: "bg-[var(--violet-600)]/10 text-[var(--violet-600)]",
  email: "bg-[var(--blue-600)]/10 text-[var(--blue-600)]",
  other: "bg-[var(--paper-50)] text-[var(--muted)]",
};

export function detailLine(job: IngestionJob) {
  if (job.items) return `${job.items} items · ${job.size}`;
  if (job.pages) return `${job.pages} pages · ${job.size}`;
  return job.size;
}

export function IngestionRow({
  job,
  selected,
  onToggle,
  onOpen,
  onReview,
  onView,
  onDownload,
  onAction,
  onAudit,
}: {
  job: IngestionJob;
  selected: boolean;
  onToggle: (id: string, checked: boolean) => void;
  onOpen: () => void;
  onReview: () => void;
  onView: () => void;
  onDownload: () => void;
  onAction: (action: JobAction) => void;
  onAudit: () => void;
}) {
  const Icon = iconFor[job.fileKind];

  return (
    <TableRow
      className="cursor-pointer transition-opacity duration-200 motion-reduce:transition-none"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen();
      }}
      tabIndex={0}
    >
      <TableCell onClick={(event) => event.stopPropagation()}>
        <Checkbox
          checked={selected}
          onCheckedChange={(value) => onToggle(job.id, value === true)}
          aria-label={`Select ${job.fileName}`}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <span className={cn("flex size-9 items-center justify-center rounded-lg", iconTone[job.fileKind])}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="m-0 max-w-64 truncate font-medium">{job.fileName}</p>
            {job.typeBadge ? (
              <Badge variant="muted" className="mt-1">
                {job.typeBadge}
              </Badge>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-[var(--muted)]">{detailLine(job)}</TableCell>
      <TableCell>{job.language ?? "—"}</TableCell>
      <TableCell>
        <JobStatus state={job.state} />
      </TableCell>
      <TableCell>
        <JobProgress job={job} />
      </TableCell>
      <TableCell>
        <JobEta job={job} />
      </TableCell>
      <TableCell onClick={(event) => event.stopPropagation()}>
        <JobActions
          job={job}
          onDetails={onOpen}
          onReview={onReview}
          onView={onView}
          onDownload={onDownload}
          onAction={onAction}
          onAudit={onAudit}
        />
      </TableCell>
    </TableRow>
  );
}
