import type { JobRow } from "@/api";
import { fileKindOf, formatBytes, typeBadgeOf } from "./files";
import type { IngestionJob, JobLanguage, ProcessingState, QueueTab } from "./types";

export const statusLabel: Record<ProcessingState, string> = {
  selected: "Preparing",
  uploading: "Uploading securely",
  verifying: "Verifying file",
  stored: "Original secured",
  queued: "Queued for OCR",
  ocr_processing: "Reading document",
  classifying: "Identifying document",
  extracting: "Extracting information",
  pending_review: "Needs validation",
  approved: "Ready and searchable",
  paused: "Paused",
  cancelled: "Cancelled",
  failed: "Action required",
  blocked: "Blocked",
};

export const stageLabel: Record<ProcessingState, string> = {
  selected: "Preparing",
  uploading: "Uploading",
  verifying: "Verifying",
  stored: "Original secured",
  queued: "Queued for OCR",
  ocr_processing: "OCR in progress",
  classifying: "Classifying",
  extracting: "Extracting",
  pending_review: "Needs review",
  approved: "Ready",
  paused: "Paused",
  cancelled: "Cancelled",
  failed: "Action required",
  blocked: "Blocked",
};

export const stageWeight = {
  preflight: 5,
  upload: 25,
  verify: 10,
  ocr: 35,
  classify: 15,
  index: 10,
} as const;

export const TIMELINE = [
  { id: "stored", label: "Original secured" },
  { id: "preflight", label: "Preflight passed" },
  { id: "ocr_processing", label: "OCR in progress" },
  { id: "classifying", label: "Classify and extract" },
  { id: "pending_review", label: "Validate if needed" },
  { id: "approved", label: "Ready and searchable" },
] as const;

/** Stage boundaries, so a job never advances on elapsed time alone. */
const stageFloor: Record<ProcessingState, number> = {
  selected: 0,
  uploading: stageWeight.preflight,
  verifying: stageWeight.preflight + stageWeight.upload,
  stored: stageWeight.preflight + stageWeight.upload + stageWeight.verify,
  queued: stageWeight.preflight + stageWeight.upload + stageWeight.verify,
  ocr_processing: stageWeight.preflight + stageWeight.upload + stageWeight.verify,
  classifying: 75,
  extracting: 85,
  pending_review: 90,
  approved: 100,
  paused: stageWeight.preflight + stageWeight.upload + stageWeight.verify,
  cancelled: stageWeight.preflight + stageWeight.upload + stageWeight.verify,
  failed: 0,
  blocked: 0,
};

export function progressForState(state: ProcessingState, fraction = 0) {
  const floor = stageFloor[state];
  if (state === "uploading") {
    return Math.round(floor + stageWeight.upload * clamp(fraction));
  }
  if (state === "ocr_processing") {
    return Math.round(floor + stageWeight.ocr * clamp(fraction));
  }
  return floor;
}

export function toneFor(state: ProcessingState): "process" | "classify" | "review" | "ready" | "danger" | "muted" {
  if (state === "approved") return "ready";
  if (state === "pending_review" || state === "paused") return "review";
  if (state === "failed" || state === "blocked") return "danger";
  if (state === "cancelled") return "muted";
  if (state === "classifying" || state === "extracting") return "classify";
  return "process";
}

export function tabFor(state: ProcessingState): QueueTab {
  if (state === "approved") return "ready";
  if (state === "pending_review") return "review";
  return "active";
}

export function isActive(state: ProcessingState) {
  return tabFor(state) === "active";
}

export function formatEta(seconds?: number) {
  if (seconds == null) return "—";
  if (seconds < 60) return "Less than 1 minute";
  if (seconds < 90) return "About 1 minute remaining";
  return `${Math.round(seconds / 60)} minutes remaining`;
}

export function languageFromCode(code?: string): JobLanguage | undefined {
  if (!code) return undefined;
  const value = code.toLowerCase();
  if (value === "ar") return "Arabic";
  if (value === "en") return "English";
  if (value === "mixed") return "Mixed";
  return undefined;
}

export function languageFromCodes(codes?: string[]): JobLanguage | undefined {
  if (!codes?.length) return undefined;
  const hasAr = codes.includes("ar");
  const hasEn = codes.includes("en");
  if (hasAr && hasEn) return "Mixed";
  if (hasAr) return "Arabic";
  if (hasEn) return "English";
  return undefined;
}

const serverStates = new Set<ProcessingState>([
  "stored",
  "queued",
  "ocr_processing",
  "classifying",
  "extracting",
  "pending_review",
  "approved",
  "paused",
  "cancelled",
  "failed",
  "blocked",
]);

/** Turns one `GET /api/jobs.cfm` row into the shape the queue renders. */
export function jobFromRow(row: JobRow): IngestionJob {
  const state = serverStates.has(row.state as ProcessingState) ? (row.state as ProcessingState) : "stored";
  const kind = fileKindOf(row.fileName, row.mimeType ?? "");
  const fraction = row.currentPage != null && row.totalPages ? row.currentPage / row.totalPages : 0;

  return {
    id: row.id,
    documentId: row.documentId,
    fileName: row.fileName,
    fileType: row.mimeType ?? "",
    fileKind: kind,
    size: formatBytes(row.byteSize),
    bytesTotal: row.byteSize,
    language: languageFromCode(row.detectedLanguage),
    state,
    stageProgress: progressForState(state, fraction),
    overallProgress: progressForState(state, fraction),
    currentPage: row.currentPage ?? undefined,
    totalPages: row.totalPages ?? undefined,
    estimatedSeconds: row.estimatedSeconds ?? undefined,
    confidence: row.confidence ?? undefined,
    message: row.message,
    errorText: row.errorText || undefined,
    typeBadge: typeBadgeOf(kind),
    allowedActions: row.allowedActions ?? [],
  };
}

export function applyJobEvent<T extends { id: string; state: ProcessingState; overallProgress: number; message: string }>(
  jobs: T[],
  event: {
    job_id: string;
    document_id?: string;
    file_name?: string;
    state: ProcessingState;
    stage_progress: number;
    overall_progress: number;
    current_page?: number | null;
    total_pages?: number | null;
    message: string;
    estimated_seconds?: number | null;
    confidence?: number | null;
    queue_position?: number | null;
    updated_at?: string;
  },
): T[] {
  return jobs.map((job) => {
    if (job.id !== event.job_id) return job;
    return {
      ...job,
      documentId: event.document_id ?? (job as T & { documentId?: string }).documentId,
      state: event.state,
      stageProgress: event.stage_progress,
      overallProgress: event.overall_progress,
      currentPage: event.current_page ?? undefined,
      totalPages: event.total_pages ?? undefined,
      message: event.message,
      estimatedSeconds: event.estimated_seconds ?? undefined,
      confidence: event.confidence ?? undefined,
      queuePosition: event.queue_position ?? undefined,
      updatedAt: event.updated_at,
    };
  });
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}
