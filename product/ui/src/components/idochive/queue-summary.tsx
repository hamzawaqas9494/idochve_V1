import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import type { QueueCounts } from "@/lib/ingestion/types";

export function QueueSummary({ counts }: { counts: QueueCounts }) {
  return (
    <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
      <p className="m-0 inline-flex items-center gap-1.5">
        <LoaderCircle className="size-4 text-[var(--blue-600)]" aria-hidden="true" />
        {counts.active} Active jobs
      </p>
      <p className="m-0 inline-flex items-center gap-1.5">
        <TriangleAlert className="size-4 text-[var(--amber)]" aria-hidden="true" />
        {counts.review} Jobs requiring review
      </p>
      <p className="m-0 inline-flex items-center gap-1.5">
        <CircleCheck className="size-4 text-[var(--success)]" aria-hidden="true" />
        {counts.ready} Ready documents
      </p>
    </div>
  );
}
