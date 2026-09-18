import { Progress } from "@/components/ui/progress";
import { formatEta, statusLabel } from "@/lib/ingestion/status-map";
import type { IngestionJob } from "@/lib/ingestion/types";

export function JobProgress({ job }: { job: IngestionJob }) {
  if (job.state === "failed" || job.state === "blocked") {
    return <p className="m-0 max-w-56 text-sm text-[var(--danger)]">{job.errorText ?? job.message}</p>;
  }

  return (
    <div className="min-w-40">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span>{job.overallProgress}%</span>
      </div>
      <Progress
        value={job.overallProgress}
        label={
          job.totalPages
            ? `${statusLabel[job.state]}, ${job.overallProgress} percent, page ${job.currentPage ?? 0} of ${job.totalPages}`
            : `${statusLabel[job.state]}, ${job.overallProgress} percent`
        }
      />
      <p className="mt-1 text-xs text-[var(--muted)]">{job.message}</p>
    </div>
  );
}

export function JobEta({ job }: { job: IngestionJob }) {
  const text = etaText(job);
  return <span className="text-sm text-[var(--muted)]">{text}</span>;
}

function etaText(job: IngestionJob) {
  if (job.state === "approved" || job.state === "pending_review" || job.state === "cancelled") {
    return "—";
  }
  if (job.state === "failed" || job.state === "blocked") {
    return "—";
  }
  if (job.queuePosition) {
    return `Queue position ${job.queuePosition}`;
  }
  if (job.estimatedSeconds != null) {
    return formatEta(job.estimatedSeconds);
  }
  return "—";
}
