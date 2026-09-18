import { useEffect, useState, type FormEvent } from "react";
import {
  askQuestion,
  decideAsk,
  decideClassification,
  decideExtraction,
  listAsks,
  listClassifications,
  listExtractions,
  listPolicies,
  type AskItem,
  type ClassificationItem,
  type ExtractionItem,
  type PolicyRow,
} from "../api";

export function IntelligencePage({
  onOpenDocument,
}: {
  onOpenDocument: (documentId: string, page?: number) => void;
}) {
  const [question, setQuestion] = useState("");
  const [items, setItems] = useState<AskItem[]>([]);
  const [classifications, setClassifications] = useState<ClassificationItem[]>([]);
  const [extractions, setExtractions] = useState<ExtractionItem[]>([]);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [current, setCurrent] = useState<AskItem | null>(null);
  const [emptyMessage, setEmptyMessage] = useState("");
  const [error, setError] = useState("");

  function reload() {
    listAsks()
      .then((result) => setItems(result.items))
      .catch((err: Error) => setError(err.message));
    listClassifications()
      .then((result) => setClassifications(result.items))
      .catch((err: Error) => setError(err.message));
    listExtractions()
      .then((result) => setExtractions(result.items))
      .catch((err: Error) => setError(err.message));
    listPolicies()
      .then((result) => setPolicies(result.policies))
      .catch((err: Error) => setError(err.message));
  }

  useEffect(() => {
    reload();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setEmptyMessage("");
    try {
      const result = await askQuestion(question);
      if (result.item) {
        setCurrent(result.item);
        setQuestion("");
        reload();
      } else {
        setCurrent(null);
        setEmptyMessage(result.emptyMessage ?? "No authorized records match.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ask failed.");
    }
  }

  async function onDecide(state: "approved" | "rejected" | "changes_requested") {
    if (!current) {
      return;
    }
    setError("");
    try {
      const result = await decideAsk(current.id, state);
      setCurrent(result.item);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed.");
    }
  }

  async function onDecideClassification(id: string, state: "approved" | "rejected" | "changes_requested") {
    setError("");
    try {
      await decideClassification(id, state);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Classification decision failed.");
    }
  }

  async function onDecideExtraction(id: string, state: "approved" | "rejected" | "changes_requested") {
    setError("");
    try {
      await decideExtraction(id, state);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction decision failed.");
    }
  }

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Intelligence</h1>
      <p style={{ color: "var(--muted)" }}>
        Questions retrieve authorized records only. Answers stay pending_review until a human decides. Public AI APIs are not used.
      </p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, maxWidth: "36rem", marginBottom: 24 }}>
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} placeholder="Ask about authorized records" />
        <button type="submit" style={{ minHeight: 40, background: "var(--blue-600)", color: "white", border: 0, borderRadius: 8 }}>
          Ask authorized sources
        </button>
      </form>
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      {emptyMessage ? <p style={{ color: "var(--muted)" }}>{emptyMessage}</p> : null}
      {current ? (
        <article style={{ background: "white", border: "1px solid var(--border)", borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <p style={{ marginTop: 0 }}>{current.question}</p>
          <p>{current.answer}</p>
          <p style={{ color: "var(--muted)" }}>
            {current.mode} · {current.state}
          </p>
          {current.citations.length ? (
            <ol>
              {current.citations.map((cite) => (
                <li key={`${cite.documentId}-${cite.rank}`}>
                  <button type="button" onClick={() => onOpenDocument(cite.documentId)}>
                    {cite.title}
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
          {current.state === "pending_review" ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => onDecide("approved")}>
                Approve
              </button>
              <button type="button" onClick={() => onDecide("changes_requested")}>
                Request changes
              </button>
              <button type="button" onClick={() => onDecide("rejected")}>
                Reject
              </button>
            </div>
          ) : null}
        </article>
      ) : null}
      <h2>Pending classification</h2>
      {classifications.length === 0 ? <p style={{ color: "var(--muted)" }}>No classification results waiting for review.</p> : null}
      {classifications.map((item) => (
        <article key={item.id} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <p style={{ marginTop: 0 }}>
            {item.title} · proposed {item.proposedCode || "(none)"} · {item.state}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => onDecideClassification(item.id, "approved")}>
              Approve
            </button>
            <button type="button" onClick={() => onDecideClassification(item.id, "changes_requested")}>
              Request changes
            </button>
            <button type="button" onClick={() => onDecideClassification(item.id, "rejected")}>
              Reject
            </button>
          </div>
        </article>
      ))}
      <h2>Pending extraction</h2>
      {extractions.length === 0 ? <p style={{ color: "var(--muted)" }}>No extraction results waiting for review.</p> : null}
      {extractions.map((item) => (
        <article key={item.id} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <p style={{ marginTop: 0 }}>
            {item.title} · {item.payload.title || "untitled"} · {item.payload.language || "language unknown"}
          </p>
          <p style={{ color: "var(--muted)" }}>{item.payload.summary || "No summary extracted."}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => onDecideExtraction(item.id, "approved")}>
              Approve
            </button>
            <button type="button" onClick={() => onDecideExtraction(item.id, "changes_requested")}>
              Request changes
            </button>
            <button type="button" onClick={() => onDecideExtraction(item.id, "rejected")}>
              Reject
            </button>
          </div>
        </article>
      ))}
      {policies.length ? (
        <p style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          Active policies: {policies.map((policy) => `${policy.code} ${policy.version}`).join(" · ")}
        </p>
      ) : null}
      <h2>Recent</h2>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setCurrent(item)}
          style={{ display: "block", width: "100%", textAlign: "start", marginBottom: 8, padding: 10, background: "white", border: "1px solid var(--border)", borderRadius: 8 }}
        >
          {item.question} · {item.state}
        </button>
      ))}
    </section>
  );
}
