import { useEffect, useState } from "react";
import { listAudit, type AuditRow } from "../api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listAudit()
      .then((result) => setRows(result.events))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <section>
      <h1 className="mt-0">Audit</h1>
      <p className="text-[var(--muted)]">Append-only events. Application users cannot edit this trail.</p>
      {error ? <p className="text-[var(--danger)]">{error}</p> : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Entity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-[13px]">{String(row.createdAt)}</TableCell>
              <TableCell>{row.eventType}</TableCell>
              <TableCell>
                {row.entityType} {row.entityId}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
