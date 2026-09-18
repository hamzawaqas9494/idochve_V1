export type ProcessingState =
  | "selected"
  | "uploading"
  | "verifying"
  | "stored"
  | "queued"
  | "ocr_processing"
  | "classifying"
  | "extracting"
  | "pending_review"
  | "approved"
  | "paused"
  | "cancelled"
  | "failed"
  | "blocked";

export type JobLanguage = "Arabic" | "English" | "Mixed";

export type FileKind = "pdf" | "office" | "image" | "archive" | "email" | "other";

export type QueueTab = "all" | "active" | "review" | "ready";

export type JobAction = "pause" | "start" | "cancel" | "remove" | "retry";

export interface IngestionJob {
  id: string;
  documentId?: string;
  fileName: string;
  fileType: string;
  fileKind: FileKind;
  size: string;
  bytesTotal?: number;
  bytesUploaded?: number;
  pages?: number;
  items?: number;
  language?: JobLanguage;
  state: ProcessingState;
  stageProgress: number;
  overallProgress: number;
  currentPage?: number;
  totalPages?: number;
  queuePosition?: number;
  estimatedSeconds?: number;
  confidence?: number;
  message: string;
  errorText?: string;
  owner?: string;
  source?: string;
  destination?: string;
  engine?: string;
  worker?: string;
  createdAt?: string;
  updatedAt?: string;
  typeBadge?: string;
  allowedActions?: string[];
  /** True while the browser still owns the transfer, before the API returns a document id. */
  isLocal?: boolean;
}

export interface IngestionJobEvent {
  job_id: string;
  document_id?: string;
  file_name: string;
  state: ProcessingState;
  stage_progress: number;
  overall_progress: number;
  current_page?: number | null;
  total_pages?: number | null;
  detected_languages?: string[];
  confidence?: number | null;
  queue_position?: number | null;
  estimated_seconds?: number | null;
  message: string;
  updated_at: string;
}

export interface QueueCounts {
  all: number;
  active: number;
  review: number;
  ready: number;
}
