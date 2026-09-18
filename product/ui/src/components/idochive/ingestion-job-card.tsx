import { Archive, FileSpreadsheet, FileText, Image, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { JobActions } from "@/components/idochive/job-actions";
import { JobEta, JobProgress } from "@/components/idochive/job-progress";
import { JobStatus } from "@/components/idochive/job-status";
import { detailLine } from "@/components/idochive/ingestion-row";
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

export function IngestionJobCard({
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
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={(value) => onToggle(job.id, value === true)}
          aria-label={`Select ${job.fileName}`}
        />
        <button type="button" className="min-w-0 flex-1 text-start" onClick={onOpen}>
          <span className={cn("mb-2 inline-flex size-9 items-center justify-center rounded-lg", iconTone[job.fileKind])}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <p className="m-0 truncate font-medium">{job.fileName}</p>
          <p className="m-0 text-xs text-[var(--muted)]">
            {detailLine(job)}
            {job.language ? ` · ${job.language}` : ""}
          </p>
        </button>
      </div>
      <div className="mt-3 grid gap-2">
        <JobStatus state={job.state} />
        <JobProgress job={job} />
        <JobEta job={job} />
        <JobActions
          job={job}
          onDetails={onOpen}
          onReview={onReview}
          onView={onView}
          onDownload={onDownload}
          onAction={onAction}
          onAudit={onAudit}
        />
      </div>
    </Card>
  );
}
