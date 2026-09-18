import { useEffect, useState, type FormEvent } from "react";
import { exportDocument, getViewerDocument, viewerPageUrl, type ViewerDocument } from "../api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ViewerPage({
  documentId,
  page,
  onPage,
}: {
  documentId?: string;
  page?: number;
  onPage: (page: number) => void;
}) {
  const [doc, setDoc] = useState<ViewerDocument | null>(null);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!documentId) {
      return;
    }
    let cancelled = false;
    getViewerDocument(documentId)
      .then((result) => {
        if (!cancelled) {
          setDoc(result);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setDoc(null);
          setDenied(true);
          setError(err.message || "access denied");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (!documentId) {
    return (
      <Alert variant="danger">
        access denied. The record is missing or outside your authorization.
      </Alert>
    );
  }

  const current = doc ? Math.min(Math.max(1, page ?? 1), doc.totalPages) : Math.max(1, page ?? 1);

  function go(next: number) {
    if (!doc) {
      return;
    }
    onPage(Math.min(Math.max(1, next), doc.totalPages));
  }

  function onJump(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(new FormData(event.currentTarget).get("page"));
    go(value);
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid gap-4">
        <div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight">{doc?.title ?? "Document"}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Authorized preview only. Encrypted originals stay immutable.
            {doc ? ` ${doc.workflowState || "no workflow state"} · version ${doc.currentVersion}` : ""}
          </p>
        </div>
        {denied ? (
          <Alert variant="danger">
            access denied.{" "}
            {error === "Document was not found."
              ? "The record is missing or outside your authorization."
              : error}
          </Alert>
        ) : null}
        {error && !denied ? <p className="text-[var(--danger)]">{error}</p> : null}
        {doc ? (
          <>
            <form className="flex flex-wrap items-end gap-2" onSubmit={onJump}>
              <label className="grid gap-1 text-sm">
                Page
                <Input
                  key={`${doc.id}-${current}`}
                  type="number"
                  name="page"
                  min={1}
                  max={doc.totalPages}
                  defaultValue={current}
                  className="w-24"
                  aria-label="Page number"
                />
              </label>
              <p className="pb-2 text-sm text-[var(--muted)]">of {doc.totalPages}</p>
              <Button type="button" variant="outline" disabled={current <= 1} onClick={() => go(current - 1)}>
                Previous
              </Button>
              <Button type="submit" variant="outline">
                Go to page
              </Button>
              <Button type="button" variant="outline" disabled={current >= doc.totalPages} onClick={() => go(current + 1)}>
                Next
              </Button>
              <Button type="button" variant="outline" onClick={() => exportDocument(doc.id).catch((err: Error) => setError(err.message))}>
                Download original
              </Button>
            </form>
            <Card className="overflow-auto p-3">
              <img
                key={`${doc.id}-${current}`}
                src={viewerPageUrl(doc.id, current)}
                alt={`Page ${current} of ${doc.totalPages}`}
                className="mx-auto max-h-[70vh] max-w-full bg-[var(--paper-50)]"
                onError={() => setError("Preview could not render this page.")}
              />
            </Card>
          </>
        ) : null}
      </div>
      <aside>
        <Card className="p-4">
          <h2 className="m-0 text-base font-semibold">Citations</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Source excerpts inherit the same permissions as the original.</p>
          <ScrollArea className="mt-3 h-[28rem]">
            {doc?.citations.length ? (
              <ol className="m-0 grid list-decimal gap-3 ps-5">
                {doc.citations.map((cite) => (
                  <li key={`${cite.chunkIndex}-${cite.page}`}>
                    <button
                      type="button"
                      className="min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--white)] p-3 text-start text-sm"
                      onClick={() => go(cite.page)}
                    >
                      <span className="block font-medium">Page {cite.page}</span>
                      <span className="mt-1 block text-[var(--muted)]">{cite.excerpt}</span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-[var(--muted)]">No derived text yet. OCR may still be queued.</p>
            )}
          </ScrollArea>
        </Card>
      </aside>
    </section>
  );
}
