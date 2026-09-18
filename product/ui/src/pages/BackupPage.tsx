import { useEffect, useState } from "react";
import { listBackups, type BackupJob, type BackupLive } from "../api";

export function BackupPage() {
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [live, setLive] = useState<BackupLive | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listBackups()
      .then((result) => {
        setJobs(result.jobs);
        setLive(result.live);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Backup</h1>
      <p style={{ color: "var(--muted)" }}>
        Pilot backups are taken with operator scripts. This screen lists jobs. Restore is not available from the browser.
      </p>
      <p style={{ color: "var(--muted)" }}>
        Run <code>pwsh -File product/ops/backup.ps1</code> then{" "}
        <code>pwsh -File product/ops/restore-verify.ps1</code>. Verify loads the dump into schema{" "}
        <code>restore_verify</code> and drops that schema. It does not replace live data.
      </p>
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      {live ? (
        <p>
          Live inventory: {live.documentCount} documents, {live.versionCount} versions, {live.blobCount} encrypted blobs.
        </p>
      ) : null}
      <table style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>
        <thead>
          <tr>
            <th style={th}>When</th>
            <th style={th}>Kind</th>
            <th style={th}>Status</th>
            <th style={th}>Documents</th>
            <th style={th}>Versions</th>
            <th style={th}>Blobs</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((row) => (
            <tr key={row.id}>
              <td style={td}>{row.startedAt}</td>
              <td style={td}>{row.kind}</td>
              <td style={td}>{row.status}</td>
              <td style={td}>{row.documentCount ?? "—"}</td>
              <td style={td}>{row.versionCount ?? "—"}</td>
              <td style={td}>{row.blobCount ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const th = { textAlign: "start" as const, borderBottom: "1px solid var(--border)", padding: 8, fontSize: 13 };
const td = { borderBottom: "1px solid var(--border)", padding: 8, fontSize: 13, fontFamily: "IBM Plex Mono, ui-monospace, monospace" };
