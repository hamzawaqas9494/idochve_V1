import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UPLOAD_ABORTED, controlJob, exportDocument, tickOcrJob, uploadDocument, type User } from "@/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { IngestionAlerts, NetworkAlert, type IngestionAlert } from "@/components/idochive/ingestion-alerts";
import { IngestionHeader } from "@/components/idochive/ingestion-header";
import { IngestionPagination } from "@/components/idochive/ingestion-pagination";
import { IngestionTable } from "@/components/idochive/ingestion-table";
import { JobDetailsSheet } from "@/components/idochive/job-details-sheet";
import { ProcessingDefaults } from "@/components/idochive/processing-defaults";
import { ProcessingPreferencesSheet } from "@/components/idochive/processing-preferences-sheet";
import { ProcessingTabs } from "@/components/idochive/processing-tabs";
import { QueueSummary } from "@/components/idochive/queue-summary";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadDropzone } from "@/components/idochive/upload-dropzone";
import { fileKindOf, formatBytes, isSupportedFile, typeBadgeOf } from "@/lib/ingestion/files";
import { progressForState, statusLabel, tabFor } from "@/lib/ingestion/status-map";
import type { IngestionJob, JobAction, ProcessingState, QueueTab } from "@/lib/ingestion/types";

const PAGE_SIZE = 10;
const PREF_CLASS = "idochive.ingest.classCode";
const PREF_LANG = "idochive.ingest.languageCode";

type LocalState = Extract<ProcessingState, "selected" | "uploading" | "verifying" | "failed">;

type UploadRow = {
  id: string;
  file: File;
  documentId?: string;
  state: LocalState;
  bytesUploaded: number;
  queuePosition?: number;
  estimatedSeconds?: number;
  message: string;
  errorText?: string;
};

export function IngestionCenterPage({
  user,
  serverJobs,
  serverCounts,
  canTick,
  queueUp,
  loadError,
  loaded,
  refresh,
  commandOpen,
  onCommandOpen,
  onOpenValidation,
  onOpenViewer,
  onOpenAudit,
}: {
  user: User;
  serverJobs: IngestionJob[];
  serverCounts: { active: number; review: number; ready: number };
  canTick: boolean;
  queueUp: boolean;
  loadError: string;
  loaded: boolean;
  refresh: () => Promise<void>;
  commandOpen: boolean;
  onCommandOpen: (open: boolean) => void;
  onOpenValidation: (documentId?: string) => void;
  onOpenViewer: (documentId: string) => void;
  onOpenAudit: () => void;
}) {
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [tab, setTab] = useState<QueueTab>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [details, setDetails] = useState<IngestionJob | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [alert, setAlert] = useState<IngestionAlert>(null);
  const [alertDetail, setAlertDetail] = useState("");
  const [page, setPage] = useState(1);
  const [live, setLive] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [classCode, setClassCode] = useState(() => readPref(PREF_CLASS, "project_report"));
  const [languageCode, setLanguageCode] = useState(() => readPref(PREF_LANG, "en"));
  const [ticking, setTicking] = useState(false);

  const waitingRef = useRef<string[]>([]);
  const filesRef = useRef(new Map<string, File>());
  const abortRef = useRef(new Map<string, () => void>());
  const runningRef = useRef(false);
  const classRef = useRef(classCode);
  const languageRef = useRef(languageCode);
  const seenStates = useRef<Record<string, ProcessingState>>({});

  useEffect(() => {
    classRef.current = classCode;
    languageRef.current = languageCode;
  }, [classCode, languageCode]);

  const jobs = useMemo(() => {
    const stored = new Set(serverJobs.map((job) => job.documentId));
    const local = uploads
      .filter((row) => !(row.documentId && stored.has(row.documentId)))
      .map((row) => localToJob(row, user.fullName));
    return [...local, ...serverJobs];
  }, [uploads, serverJobs, user.fullName]);

  const counts = useMemo(() => {
    const localActive = jobs.filter((job) => job.isLocal).length;
    return {
      all: serverCounts.active + serverCounts.review + serverCounts.ready + localActive,
      active: serverCounts.active + localActive,
      review: serverCounts.review,
      ready: serverCounts.ready,
    };
  }, [jobs, serverCounts]);

  const filtered = useMemo(
    () => (tab === "all" ? jobs : jobs.filter((job) => tabFor(job.state) === tab)),
    [jobs, tab],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    const changes = jobs
      .filter((job) => seenStates.current[job.id] && seenStates.current[job.id] !== job.state)
      .map((job) => `${job.fileName}: ${statusLabel[job.state]}`);
    for (const job of jobs) seenStates.current[job.id] = job.state;
    if (changes.length) setLive(changes.join(". "));
  }, [jobs]);

  const renumber = useCallback(() => {
    setUploads((current) =>
      current.map((row) => {
        if (row.state !== "selected") return row;
        const index = waitingRef.current.indexOf(row.id);
        return { ...row, queuePosition: index >= 0 ? index + 1 : undefined };
      }),
    );
  }, []);

  const uploadOne = useCallback(
    async (id: string) => {
      const file = filesRef.current.get(id);
      if (!file) return;

      const startedAt = Date.now();
      setUploads((current) =>
        current.map((row) =>
          row.id === id
            ? {
                ...row,
                state: "uploading",
                queuePosition: undefined,
                bytesUploaded: 0,
                errorText: undefined,
                message: `Uploading ${formatBytes(0)} of ${formatBytes(file.size)}`,
              }
            : row,
        ),
      );

      const handle = uploadDocument(file, {
        classCode: classRef.current,
        languageCode: languageRef.current,
        onProgress: (loaded, total) => {
          const elapsed = (Date.now() - startedAt) / 1000;
          const speed = elapsed > 0.4 ? loaded / elapsed : 0;
          const estimated = speed > 0 && loaded < total ? Math.round((total - loaded) / speed) : undefined;
          setUploads((current) =>
            current.map((row) =>
              row.id === id
                ? {
                    ...row,
                    bytesUploaded: loaded,
                    estimatedSeconds: estimated,
                    message: `Uploading ${formatBytes(loaded)} of ${formatBytes(total)}`,
                  }
                : row,
            ),
          );
        },
      });
      abortRef.current.set(id, handle.abort);

      try {
        const result = await handle.promise;
        filesRef.current.delete(id);
        setUploads((current) =>
          current.map((row) =>
            row.id === id
              ? {
                  ...row,
                  state: "verifying",
                  documentId: result.id,
                  bytesUploaded: file.size,
                  estimatedSeconds: undefined,
                  message: "Verifying the encrypted original.",
                }
              : row,
          ),
        );
        setLive(`${file.name}: original secured.`);
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed.";
        if (message === UPLOAD_ABORTED) {
          filesRef.current.delete(id);
          setUploads((current) => current.filter((row) => row.id !== id));
          setLive(`${file.name}: upload cancelled.`);
        } else {
          setUploads((current) =>
            current.map((row) =>
              row.id === id
                ? { ...row, state: "failed", estimatedSeconds: undefined, errorText: message, message }
                : row,
            ),
          );
          setActionError(`${file.name}: ${message}`);
        }
      } finally {
        abortRef.current.delete(id);
      }
    },
    [refresh],
  );

  const startQueue = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    void (async () => {
      try {
        while (waitingRef.current.length) {
          const id = waitingRef.current[0];
          waitingRef.current = waitingRef.current.slice(1);
          renumber();
          await uploadOne(id);
        }
      } finally {
        runningRef.current = false;
        await refresh();
      }
    })();
  }, [renumber, uploadOne, refresh]);

  const onChoose = useCallback(
    (list: File[]) => {
      const supported: File[] = [];
      const skipped: string[] = [];
      for (const file of list) {
        if (isSupportedFile(file)) supported.push(file);
        else skipped.push(file.name);
      }

      if (skipped.length) {
        setAlertDetail(describeSkipped(skipped));
        setAlert("unsupported");
      }
      if (!supported.length) return;

      setActionError("");
      const rows: UploadRow[] = supported.map((file) => ({
        id: `local_${crypto.randomUUID()}`,
        file,
        state: "selected",
        bytesUploaded: 0,
        message: "Waiting to upload.",
      }));
      for (const row of rows) filesRef.current.set(row.id, row.file);
      waitingRef.current = [...waitingRef.current, ...rows.map((row) => row.id)];

      setUploads((current) => [...rows, ...current]);
      setTab("all");
      setPage(1);
      setLive(`${rows.length} file${rows.length === 1 ? "" : "s"} added. Upload started.`);
      renumber();
      startQueue();
    },
    [renumber, startQueue],
  );

  const onAction = useCallback(
    async (job: IngestionJob, action: JobAction) => {
      setActionError("");
      setNotice("");

      if (job.isLocal) {
        if (action === "cancel") {
          const abort = abortRef.current.get(job.id);
          if (abort) {
            abort();
            return;
          }
          waitingRef.current = waitingRef.current.filter((id) => id !== job.id);
          filesRef.current.delete(job.id);
          setUploads((current) => current.filter((row) => row.id !== job.id));
          renumber();
          return;
        }
        if (action === "retry") {
          if (!filesRef.current.has(job.id)) {
            setActionError(`${job.fileName} must be selected again before it can retry.`);
            return;
          }
          waitingRef.current = [...waitingRef.current, job.id];
          setUploads((current) =>
            current.map((row) =>
              row.id === job.id ? { ...row, state: "selected", errorText: undefined, message: "Waiting to upload." } : row,
            ),
          );
          renumber();
          startQueue();
        }
        return;
      }

      if (!job.documentId || action === "retry") {
        setActionError("This job cannot be retried from the queue. Upload the corrected file again.");
        return;
      }

      try {
        await controlJob(job.documentId, action);
        setNotice(`${job.fileName}: ${action} stored.`);
        await refresh();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "The action failed.");
      }
    },
    [refresh, renumber, startQueue],
  );

  async function onProcessNext() {
    setTicking(true);
    setActionError("");
    try {
      const result = await tickOcrJob();
      setNotice(result.message ?? "The background worker was asked to take the next job.");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Process next failed.");
    } finally {
      setTicking(false);
    }
  }

  return (
    <section className="grid gap-5">
      <IngestionHeader />
      <UploadDropzone
        dragging={dragging}
        onDragging={setDragging}
        onChoose={onChoose}
        onShowFormats={() => {
          setAlertDetail("");
          setAlert("formats");
        }}
      />
      <ProcessingDefaults onOpen={() => setPrefsOpen(true)} />
      <NetworkAlert message={loadError} />
      {actionError ? <Alert variant="danger">{actionError}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ProcessingTabs
          tab={tab}
          counts={counts}
          onChange={(value) => {
            setTab(value);
            setPage(1);
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <QueueSummary counts={counts} />
          {canTick && !queueUp ? (
            <Button type="button" variant="outline" size="sm" disabled={ticking} onClick={() => void onProcessNext()}>
              Process next
            </Button>
          ) : null}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {live}
      </p>

      {visible.length ? (
        <IngestionTable
          jobs={visible}
          selected={selected}
          onToggle={(id, checked) =>
            setSelected((current) => (checked ? [...current, id] : current.filter((item) => item !== id)))
          }
          onToggleAll={(checked) => setSelected(checked ? visible.map((job) => job.id) : [])}
          onOpen={setDetails}
          onReview={(job) => onOpenValidation(job.documentId)}
          onView={(job) => {
            if (job.documentId) onOpenViewer(job.documentId);
          }}
          onDownload={(job) => {
            if (!job.documentId) return;
            exportDocument(job.documentId).catch((err: Error) => setActionError(err.message));
          }}
          onAction={(job, action) => void onAction(job, action)}
          onAudit={onOpenAudit}
        />
      ) : loaded ? (
        <p className="text-sm text-[var(--muted)]">
          Nothing in this view yet. Drop scanned PDFs or images above and processing starts on its own.
        </p>
      ) : (
        <div className="grid gap-2" aria-hidden="true">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      )}

      <IngestionPagination
        shown={visible.length}
        total={filtered.length}
        page={safePage}
        pageCount={pageCount}
        onPage={setPage}
      />

      <ProcessingPreferencesSheet
        open={prefsOpen}
        onOpenChange={setPrefsOpen}
        classCode={classCode}
        languageCode={languageCode}
        department="Your department collection"
        onClassCode={(value) => {
          setClassCode(value);
          writePref(PREF_CLASS, value);
        }}
        onLanguageCode={(value) => {
          setLanguageCode(value);
          writePref(PREF_LANG, value);
        }}
      />

      <JobDetailsSheet
        job={details}
        open={Boolean(details)}
        onOpenChange={(open) => {
          if (!open) setDetails(null);
        }}
        onAudit={onOpenAudit}
        onView={() => {
          if (details?.documentId) onOpenViewer(details.documentId);
        }}
      />

      <IngestionAlerts kind={alert} detail={alertDetail} onClose={() => setAlert(null)} />

      <Dialog open={commandOpen} onOpenChange={onCommandOpen}>
        <DialogContent className="p-0">
          <DialogTitle className="sr-only">Search documents, jobs, or anything</DialogTitle>
          <Command>
            <CommandInput placeholder="Search documents, jobs, or anything..." />
            <CommandList>
              <CommandEmpty>No authorized records match.</CommandEmpty>
              {jobs.map((job) => (
                <CommandItem
                  key={job.id}
                  value={job.fileName}
                  onSelect={() => {
                    setDetails(job);
                    onCommandOpen(false);
                  }}
                >
                  {job.fileName}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function localToJob(row: UploadRow, owner: string): IngestionJob {
  const kind = fileKindOf(row.file.name, row.file.type);
  const fraction = row.file.size ? row.bytesUploaded / row.file.size : 0;
  return {
    id: row.id,
    documentId: row.documentId,
    fileName: row.file.name,
    fileType: row.file.type,
    fileKind: kind,
    size: formatBytes(row.file.size),
    bytesTotal: row.file.size,
    bytesUploaded: row.bytesUploaded,
    state: row.state,
    stageProgress: progressForState(row.state, fraction),
    overallProgress: progressForState(row.state, fraction),
    queuePosition: row.queuePosition,
    estimatedSeconds: row.estimatedSeconds,
    message: row.message,
    errorText: row.errorText,
    owner,
    source: "This browser",
    typeBadge: typeBadgeOf(kind),
    allowedActions: [],
    isLocal: true,
  };
}

function describeSkipped(names: string[]) {
  const shown = names.slice(0, 15).join(", ");
  return names.length > 15 ? `${shown} and ${names.length - 15} more` : shown;
}

function readPref(key: string, fallback: string) {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // A blocked storage quota must not stop an upload.
  }
}
