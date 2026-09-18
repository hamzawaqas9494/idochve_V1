import { useEffect, useState } from "react";
import { addComment, decideTask, listComments, listTasks, type CommentRow, type WorkflowTask } from "../api";

export function WorkflowsPage() {
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [selected, setSelected] = useState<WorkflowTask | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function reload() {
    listTasks()
      .then((result) => setTasks(result.tasks))
      .catch((err: Error) => setError(err.message));
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!selected) {
      return;
    }
    listComments(selected.documentId)
      .then((result) => setComments(result.comments))
      .catch((err: Error) => setError(err.message));
  }, [selected]);

  async function onDecide(state: "approved" | "rejected" | "changes_requested") {
    if (!selected) {
      return;
    }
    setError("");
    setNotice("");
    try {
      const result = await decideTask(selected.id, state, comment);
      setNotice(
        result.locked
          ? "Approved and locked. The encrypted original was not changed."
          : `Decision stored: ${result.state}.`,
      );
      setComment("");
      setSelected(null);
      setComments([]);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed.");
    }
  }

  async function onComment() {
    if (!selected) {
      return;
    }
    setError("");
    try {
      await addComment(selected.documentId, comment);
      setNotice("Comment stored. Comments cannot be edited.");
      setComment("");
      const result = await listComments(selected.documentId);
      setComments(result.comments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comment failed.");
    }
  }

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Workflows</h1>
      <p style={{ color: "var(--muted)" }}>
        Reviewers decide pending_review items. Approval locks the record. Comments are append-only.
      </p>
      {notice ? <p style={{ color: "var(--success)" }}>{notice}</p> : null}
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          {tasks.length === 0 ? <p style={{ color: "var(--muted)" }}>No open review tasks.</p> : null}
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => setSelected(task)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "start",
                marginBottom: 8,
                padding: 12,
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: selected?.id === task.id ? "var(--paper-50)" : "white",
                cursor: "pointer",
              }}
            >
              <strong>{task.title}</strong>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                Version {task.versionNumber} · {task.state}
                {task.locked ? " · locked" : ""}
              </div>
            </button>
          ))}
        </div>
        <div>
          {selected ? (
            <>
              <h2 style={{ marginTop: 0, fontSize: 18 }}>{selected.title}</h2>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={4}
                placeholder="Decision comment or immutable note"
                style={{ width: "100%", boxSizing: "border-box", padding: 8 }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => onDecide("approved")} style={action("var(--blue-600)")}>
                  Approve and lock
                </button>
                <button type="button" onClick={() => onDecide("changes_requested")} style={action("var(--violet-600)")}>
                  Request changes
                </button>
                <button type="button" onClick={() => onDecide("rejected")} style={action("var(--danger)")}>
                  Reject
                </button>
                <button type="button" onClick={onComment} style={action("var(--teal-600)")}>
                  Add comment
                </button>
              </div>
              <h3 style={{ fontSize: 16 }}>Comments</h3>
              {comments.length === 0 ? <p style={{ color: "var(--muted)" }}>No comments yet.</p> : null}
              {comments.map((item) => (
                <p key={item.id} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
                  <strong>{item.author}</strong>
                  <span style={{ color: "var(--muted)", marginInlineStart: 8, fontSize: 12 }}>{item.createdAt}</span>
                  <br />
                  {item.body}
                </p>
              ))}
            </>
          ) : (
            <p style={{ color: "var(--muted)" }}>Select a task to decide or comment.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function action(background: string) {
  return {
    minHeight: 40,
    background,
    color: "white",
    border: 0,
    borderRadius: 8,
    padding: "0 12px",
  };
}
