import { useEffect, useState } from "react";
import { getHealth, type Health } from "../api";
import { Card } from "@/components/ui/card";

export function HomePage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <section>
      <h1 className="mt-0">System status</h1>
      <p className="text-[var(--muted)]">
        PostgreSQL is the system of record. Redis is the job list when available. Public AI APIs are not required.
      </p>
      {error ? <p className="text-[var(--danger)]">{error}</p> : null}
      {health ? (
        <Card className="mt-4 max-w-xl">
          <dl className="grid grid-cols-[12rem_1fr] gap-2">
            <dt>Status</dt>
            <dd>{health.status}</dd>
            <dt>Engine</dt>
            <dd>{health.engine}</dd>
            <dt>Database</dt>
            <dd>{health.database.systemOfRecord}</dd>
            <dt>PostgreSQL</dt>
            <dd>{health.database.reachable ? "healthy" : "unreachable"}</dd>
            <dt>pgvector</dt>
            <dd>{health.database.pgvector ? "enabled" : "missing"}</dd>
            <dt>Redis</dt>
            <dd>
              {health.queue?.available ? `available · depth ${health.queue.depth}` : "not available (background worker drains PostgreSQL)"}
            </dd>
            <dt>OCR</dt>
            <dd>
              {health.ocr?.engine ?? "tesseract"} · {health.ocr?.available ? "available" : "not installed"}
            </dd>
            <dt>PDF rasterizer</dt>
            <dd>
              {health.ocr?.rasterizer?.engine ?? "pdftoppm"} ·{" "}
              {health.ocr?.rasterizer?.available ? "available" : "not installed (PDFs cannot be OCR'd)"}
            </dd>
            <dt>Embedding</dt>
            <dd>
              {health.embedding?.engine ?? "ollama"} · {health.embedding?.model ?? "nomic-embed-text"} ·{" "}
              {health.embedding?.available ? "available" : "not installed"}
            </dd>
            <dt>Generate</dt>
            <dd>
              {health.generate?.engine ?? "ollama"} · {health.generate?.model ?? "qwen2.5:3b"} ·{" "}
              {health.generate?.available ? "available" : "not installed"}
            </dd>
            <dt>Public AI API</dt>
            <dd>{health.publicAiApiRequired ? "required" : "not required"}</dd>
          </dl>
        </Card>
      ) : null}
    </section>
  );
}
