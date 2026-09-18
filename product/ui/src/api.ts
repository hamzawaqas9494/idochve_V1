export type User = {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
  departmentId: string;
  roles: string[];
};

export type Health = {
  status: string;
  engine: string;
  database: { reachable: boolean; pgvector: boolean; systemOfRecord: string };
  ocr?: { engine: string; available: boolean; rasterizer?: { engine: string; available: boolean } };
  embedding?: { engine: string; model: string; dimension: number; available: boolean };
  generate?: { engine: string; model: string; available: boolean };
  queue?: { engine: string; available: boolean; depth: number };
  publicAiApiRequired: boolean;
};

export type DocumentRow = {
  id: string;
  title: string;
  language: string;
  classCode: string;
  currentVersion: number | null;
  workflowState: string;
  locked: boolean;
  openTaskId: string;
  createdAt: string;
};

export type AuditRow = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data;
}

export function getHealth() {
  return request<Health>("/api/health.cfm");
}

export function getSession() {
  return request<{ user: User }>("/api/session.cfm");
}

export function login(email: string, password: string) {
  return request<{ user: User }>("/api/session.cfm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function logout() {
  return request<{ ok: boolean }>("/api/session.cfm", { method: "DELETE" });
}

export function listDocuments() {
  return request<{ contractVersion?: string; documents: DocumentRow[] }>("/api/documents.cfm");
}

export type ViewerCitation = {
  chunkIndex: number;
  page: number;
  excerpt: string;
};

export type ViewerDocument = {
  contractVersion?: string;
  id: string;
  title: string;
  mimeType: string;
  workflowState: string;
  locked: boolean;
  currentVersion: number;
  totalPages: number;
  citations: ViewerCitation[];
};

export function getViewerDocument(documentId: string) {
  return request<ViewerDocument>(`/api/viewer.cfm?documentId=${encodeURIComponent(documentId)}`);
}

export function viewerPageUrl(documentId: string, page: number) {
  return `/api/viewer/page.cfm?documentId=${encodeURIComponent(documentId)}&page=${page}`;
}

export type JobFilter = "all" | "active" | "review" | "ready";

export type JobRow = {
  id: string;
  documentId: string;
  fileName: string;
  byteSize: number;
  state: string;
  label: string;
  message: string;
  overallProgress: number;
  stageProgress?: number;
  currentPage: number | null;
  totalPages: number | null;
  estimatedSeconds?: number | null;
  detectedLanguage: string;
  confidence: number | null;
  errorText?: string;
  workflowState?: string;
  filter?: JobFilter;
  nextAction?: string;
  mimeType?: string;
  allowedActions?: string[];
};

export type JobList = {
  contractVersion: string;
  items: JobRow[];
  counts: { active: number; review: number; ready: number };
  canTick: boolean;
  queue?: { engine: string; available: boolean; depth: number };
};

export function controlJob(documentId: string, action: "pause" | "start" | "cancel" | "remove") {
  return request<{ ok: boolean; action: string; documentId: string; error?: string }>("/api/jobs/control.cfm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId, action }),
  });
}

export function listJobs(filter: JobFilter = "all") {
  return request<JobList>(`/api/jobs.cfm?filter=${encodeURIComponent(filter)}`);
}

export async function exportDocument(documentId: string) {
  const response = await fetch(`/api/export.cfm?documentId=${encodeURIComponent(documentId)}`, {
    credentials: "include",
  });
  const disposition = response.headers.get("Content-Disposition") ?? "";
  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error ?? "Export failed");
  }
  const blob = await response.blob();
  const match = disposition.match(/filename="([^"]+)"/);
  const name = match?.[1] ?? "document.bin";
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function createDocument(form: FormData) {
  return request<{ contractVersion?: string; id: string; state: string; documents?: { id: string; state: string }[] }>(
    "/api/documents.cfm",
    {
      method: "POST",
      body: form,
    },
  );
}

export type UploadResult = { contractVersion?: string; id: string; state: string; documents?: { id: string; state: string }[]; uploadId?: string };

export type UploadHandle = { promise: Promise<UploadResult>; abort: () => void };

export const UPLOAD_ABORTED = "UPLOAD_ABORTED";
export const RESUMABLE_MIN_BYTES = 64 * 1024;
const RESUMABLE_CHUNK_BYTES = 256 * 1024;

type UploadSession = {
  contractVersion?: string;
  id: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  chunkSize: number;
  chunkCount: number;
  receivedIndexes: number[];
  receivedCount: number;
  status: string;
  documentId?: string | null;
  error?: string;
};

/** Uploads one original and reports real transferred bytes so the queue never shows invented progress. */
export function uploadDocument(
  file: File,
  options: {
    classCode: string;
    languageCode: string;
    onProgress?: (loaded: number, total: number) => void;
  },
): UploadHandle {
  if (file.size >= RESUMABLE_MIN_BYTES) {
    return uploadResumable(file, options);
  }
  return uploadMultipart(file, options);
}

function uploadMultipart(
  file: File,
  options: {
    classCode: string;
    languageCode: string;
    onProgress?: (loaded: number, total: number) => void;
  },
): UploadHandle {
  const xhr = new XMLHttpRequest();
  const form = new FormData();
  form.set("file", file);
  form.set("classCode", options.classCode);
  form.set("languageCode", options.languageCode);

  const promise = new Promise<UploadResult>((resolve, reject) => {
    xhr.open("POST", "/api/documents.cfm");
    xhr.withCredentials = true;
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        options.onProgress?.(event.loaded, event.total);
      }
    });
    xhr.addEventListener("load", () => {
      const data = parseUploadResponse(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300 && data?.id) {
        resolve(data);
        return;
      }
      reject(new Error(data?.error ?? `Upload failed with status ${xhr.status}.`));
    });
    xhr.addEventListener("error", () => reject(new Error("The connection dropped during upload.")));
    xhr.addEventListener("abort", () => reject(new Error(UPLOAD_ABORTED)));
    xhr.send(form);
  });

  return { promise, abort: () => xhr.abort() };
}

function uploadResumable(
  file: File,
  options: {
    classCode: string;
    languageCode: string;
    onProgress?: (loaded: number, total: number) => void;
  },
): UploadHandle {
  const abort = new AbortController();
  let chunkXhr: XMLHttpRequest | null = null;

  const promise = (async () => {
    const started = await fetch("/api/uploads.cfm", {
      method: "POST",
      credentials: "include",
      signal: abort.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type,
        byteSize: file.size,
        chunkSize: RESUMABLE_CHUNK_BYTES,
        classCode: options.classCode,
        languageCode: options.languageCode,
      }),
    });
    const session = (await started.json()) as UploadSession;
    if (!started.ok || !session.id) {
      throw new Error(session.error ?? "Upload could not start.");
    }
    const received = new Set(session.receivedIndexes ?? []);
    const chunkCount = session.chunkCount;
    const chunkSize = session.chunkSize;
    let loaded = 0;
    for (let index = 0; index < chunkCount; index++) {
      const size = index === chunkCount - 1 ? file.size - (chunkCount - 1) * chunkSize : chunkSize;
      if (received.has(index)) {
        loaded += size;
        options.onProgress?.(loaded, file.size);
        continue;
      }
      const blob = file.slice(index * chunkSize, index * chunkSize + size);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        chunkXhr = xhr;
        const form = new FormData();
        form.set("uploadId", session.id);
        form.set("index", String(index));
        form.set("chunk", blob, `${file.name}.part${index}`);
        xhr.open("POST", "/api/uploads/chunk.cfm");
        xhr.withCredentials = true;
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            options.onProgress?.(loaded + event.loaded, file.size);
          }
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            loaded += size;
            options.onProgress?.(loaded, file.size);
            resolve();
            return;
          }
          let message = `Chunk ${index} failed with status ${xhr.status}.`;
          try {
            const parsed = JSON.parse(xhr.responseText || "{}") as { error?: string };
            if (parsed.error) {
              message = parsed.error;
            }
          } catch {
            // Keep the status message when the body is not JSON.
          }
          reject(new Error(message));
        });
        xhr.addEventListener("error", () => reject(new Error("The connection dropped during upload.")));
        xhr.addEventListener("abort", () => reject(new Error(UPLOAD_ABORTED)));
        xhr.send(form);
      });
    }
    const finished = await fetch("/api/uploads/complete.cfm", {
      method: "POST",
      credentials: "include",
      signal: abort.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadId: session.id }),
    });
    const data = (await finished.json()) as UploadResult & { error?: string };
    if (!finished.ok || !data.id) {
      throw new Error(data.error ?? "Upload could not be completed.");
    }
    return data;
  })();

  return {
    promise: promise.catch((err: unknown) => {
      if (abort.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
        throw new Error(UPLOAD_ABORTED);
      }
      throw err;
    }),
    abort: () => {
      abort.abort();
      chunkXhr?.abort();
    },
  };
}

function parseUploadResponse(body: string) {
  try {
    return JSON.parse(body) as UploadResult & { error?: string };
  } catch {
    return null;
  }
}

export type OcrQueueItem = {
  id: string;
  documentId: string;
  title: string;
  language: string;
  meanConfidence: number;
  text: string;
  createdAt: string;
};

export function listOcrQueue() {
  return request<{ items: OcrQueueItem[] }>("/api/ocr.cfm");
}

export function correctOcr(id: string, correctedText: string) {
  return request<{ ok: boolean }>("/api/ocr.cfm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, correctedText }),
  });
}

export function tickOcrJob() {
  return request<{
    ok: boolean;
    processed: boolean;
    workerRunning?: boolean;
    woken?: boolean;
    message?: string;
    status?: string;
    error?: string;
  }>("/api/jobs/tick.cfm", {
    method: "POST",
  });
}

export function addVersion(form: FormData) {
  return request<{ id: string; versionNumber: number; state: string }>("/api/versions.cfm", {
    method: "POST",
    body: form,
  });
}

export type WorkflowTask = {
  id: string;
  documentId: string;
  title: string;
  state: string;
  locked: boolean;
  versionNumber: number;
  createdAt: string;
};

export type CommentRow = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
};

export function listTasks() {
  return request<{ tasks: WorkflowTask[] }>("/api/tasks.cfm");
}

export function decideTask(id: string, state: string, comment: string) {
  return request<{ ok: boolean; state: string; locked: boolean }>("/api/tasks.cfm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, state, comment }),
  });
}

export function listComments(documentId: string) {
  return request<{ comments: CommentRow[] }>(`/api/comments.cfm?documentId=${encodeURIComponent(documentId)}`);
}

export function addComment(documentId: string, body: string) {
  return request<{ ok: boolean }>("/api/comments.cfm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId, body }),
  });
}

export type SearchHit = {
  id: string;
  title: string;
  language: string;
  classCode: string;
  currentVersion: number | null;
  workflowState: string;
  matchType?: string;
};

export function searchDocuments(q: string, classCode = "", languageCode = "", semantic = false) {
  const params = new URLSearchParams();
  if (q) {
    params.set("q", q);
  }
  if (classCode) {
    params.set("classCode", classCode);
  }
  if (languageCode) {
    params.set("languageCode", languageCode);
  }
  if (semantic) {
    params.set("semantic", "1");
  }
  return request<{ results: SearchHit[]; emptyReason?: string; emptyMessage?: string; semanticApplied?: boolean }>(
    `/api/search.cfm?${params.toString()}`,
  );
}

export function listAudit() {
  return request<{ events: AuditRow[] }>("/api/audit.cfm");
}

export type BackupJob = {
  id: string;
  kind: string;
  status: string;
  archiveDir: string;
  documentCount: number | null;
  versionCount: number | null;
  blobCount: number | null;
  startedAt: string;
  finishedAt: string;
};

export type BackupLive = {
  documentCount: number;
  versionCount: number;
  blobCount: number;
};

export function listBackups() {
  return request<{ jobs: BackupJob[]; live: BackupLive }>("/api/backup.cfm");
}

export type AskCitation = {
  documentId: string;
  title: string;
  rank: number;
};

export type AskItem = {
  id: string;
  requestId: string;
  question: string;
  answer: string;
  mode: string;
  state: string;
  createdAt: string;
  citations: AskCitation[];
};

export function listAsks() {
  return request<{ items: AskItem[] }>("/api/ask.cfm");
}

export function askQuestion(question: string) {
  return request<{ ok?: boolean; item?: AskItem; emptyReason?: string; emptyMessage?: string }>("/api/ask.cfm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
}

export function decideAsk(id: string, state: "approved" | "rejected" | "changes_requested") {
  return request<{ ok: boolean; item: AskItem }>("/api/ask.cfm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, state }),
  });
}

export type PolicyRow = {
  code: string;
  name: string;
  version: string;
  versionId: string;
};

export type ClassificationItem = {
  id: string;
  documentId: string;
  title: string;
  proposedCode: string;
  state: string;
  createdAt: string;
};

export type ExtractionItem = {
  id: string;
  documentId: string;
  title: string;
  payload: { title?: string; language?: string; summary?: string; generateAvailable?: boolean };
  state: string;
  createdAt: string;
};

export function listPolicies() {
  return request<{ policies: PolicyRow[] }>("/api/policies.cfm");
}

export function listClassifications() {
  return request<{ items: ClassificationItem[] }>("/api/classifications.cfm");
}

export function decideClassification(id: string, state: "approved" | "rejected" | "changes_requested") {
  return request<{ ok: boolean }>("/api/classifications.cfm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, state }),
  });
}

export function listExtractions() {
  return request<{ items: ExtractionItem[] }>("/api/extractions.cfm");
}

export function decideExtraction(id: string, state: "approved" | "rejected" | "changes_requested") {
  return request<{ ok: boolean }>("/api/extractions.cfm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, state }),
  });
}
