import { stageLabel, toneFor } from "@/lib/ingestion/status-map";
import type { ProcessingState } from "@/lib/ingestion/types";
import { cn } from "@/lib/utils";

const toneClass = {
  process: "text-[var(--blue-600)]",
  classify: "text-[var(--violet-600)]",
  review: "text-[var(--amber)]",
  ready: "text-[var(--success)]",
  danger: "text-[var(--danger)]",
  muted: "text-[var(--muted)]",
};

const dotClass = {
  process: "bg-[var(--blue-600)]",
  classify: "bg-[var(--violet-600)]",
  review: "bg-[var(--amber)]",
  ready: "bg-[var(--success)]",
  danger: "bg-[var(--danger)]",
  muted: "bg-[var(--muted)]",
};

export function JobStatus({ state }: { state: ProcessingState }) {
  const tone = toneFor(state);
  const pulse = state === "ocr_processing" || state === "uploading" || state === "classifying";
  return (
    <p className={cn("m-0 inline-flex items-center gap-2 text-sm font-medium", toneClass[tone])}>
      <span
        className={cn("size-2 rounded-full", dotClass[tone], pulse && "animate-pulse motion-reduce:animate-none")}
        aria-hidden="true"
      />
      {stageLabel[state]}
    </p>
  );
}
