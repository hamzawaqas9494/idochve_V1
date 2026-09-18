import { useEffect, useState } from "react";
import { listDocuments, type DocumentRow } from "../api";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DocumentsPage({ onOpenDocument }: { onOpenDocument: (documentId: string) => void }) {
  const [items, setItems] = useState<DocumentRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    listDocuments()
      .then((result) => setItems(result.documents))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <section className="grid gap-5">
      <div>
        <h1 className="m-0 text-2xl font-semibold tracking-tight">All Documents</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Authorized records in your department. New files enter through Ingestion.
        </p>
      </div>
      {error ? <p className="text-[var(--danger)]">{error}</p> : null}
      <Card className="hidden overflow-hidden p-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                tabIndex={0}
                onClick={() => onOpenDocument(item.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onOpenDocument(item.id);
                }}
              >
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>{item.classCode}</TableCell>
                <TableCell>{item.language}</TableCell>
                <TableCell>{item.workflowState}</TableCell>
                <TableCell className="text-[var(--muted)]">{item.createdAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <div className="grid gap-3 md:hidden">
        {items.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer p-4"
            tabIndex={0}
            onClick={() => onOpenDocument(item.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onOpenDocument(item.id);
            }}
          >
            <p className="m-0 font-medium">{item.title}</p>
            <p className="m-0 mt-1 text-sm text-[var(--muted)]">
              {item.classCode} · {item.language} · {item.workflowState}
            </p>
          </Card>
        ))}
      </div>
      {!items.length && !error ? <p className="text-sm text-[var(--muted)]">No authorized documents yet.</p> : null}
    </section>
  );
}
