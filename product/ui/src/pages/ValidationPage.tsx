import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { correctOcr, listOcrQueue, tickOcrJob, type OcrQueueItem } from "../api";

export function ValidationPage({ documentId }: { documentId?: string }) {
  const [items, setItems] = useState<OcrQueueItem[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function reload() {
    listOcrQueue()
      .then((result) => {
        setItems(result.items);
        setDrafts((current) => {
          const next = { ...current };
          for (const item of result.items) {
            if (!(item.id in next)) {
              next[item.id] = item.text;
            }
          }
          return next;
        });
      })
      .catch((err: Error) => setError(err.message));
  }

  useEffect(() => {
    reload();
  }, []);

  async function onTick() {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await tickOcrJob();
      setNotice(result.message ?? "The background worker was asked to take the next job.");
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR tick failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onCorrect(id: string) {
    setError("");
    setNotice("");
    try {
      await correctOcr(id, drafts[id] ?? "");
      setNotice("Correction stored. The encrypted original was not changed.");
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Correction failed.");
    }
  }

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Validation</h1>
      <p style={{ color: "var(--muted)" }}>
        Low-confidence or empty OCR waits here. Reviewers correct derived text only. Encrypted originals stay immutable.
        {documentId ? ` Focused record: ${documentId}.` : ""}
      </p>
      <Button type="button" variant="teal" onClick={onTick} disabled={busy} className="mb-4">
        Process next OCR job
      </Button>
      {notice ? <p style={{ color: "var(--success)" }}>{notice}</p> : null}
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      {items.length === 0 ? <p style={{ color: "var(--muted)" }}>No items need validation.</p> : null}
      {items.map((item) => (
        <Card key={item.id} className="mb-4">
          <h2 style={{ marginTop: 0, fontSize: 18 }}>{item.title}</h2>
          <p style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
            Confidence {item.meanConfidence.toFixed(1)} · {item.language}
          </p>
          <textarea
            value={drafts[item.id] ?? ""}
            onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
            rows={8}
            style={{ width: "100%", boxSizing: "border-box", padding: 8 }}
          />
          <Button type="button" className="mt-2 bg-[var(--violet-600)]" onClick={() => onCorrect(item.id)}>
            Save correction
          </Button>
        </Card>
      ))}
    </section>
  );
}
