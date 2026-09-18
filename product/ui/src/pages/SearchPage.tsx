import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getHealth, searchDocuments, type SearchHit } from "../api";

export function SearchPage({ onOpenDocument }: { onOpenDocument: (documentId: string) => void }) {
  const [q, setQ] = useState("");
  const [classCode, setClassCode] = useState("");
  const [languageCode, setLanguageCode] = useState("");
  const [semantic, setSemantic] = useState(false);
  const [semanticAvailable, setSemanticAvailable] = useState(false);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [emptyMessage, setEmptyMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getHealth()
      .then((health) => setSemanticAvailable(Boolean(health.embedding?.available)))
      .catch(() => setSemanticAvailable(false));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setEmptyMessage("");
    try {
      const result = await searchDocuments(q, classCode, languageCode, semantic && semanticAvailable);
      setResults(result.results);
      setEmptyMessage(result.results.length ? "" : (result.emptyMessage ?? "No authorized records match."));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    }
  }

  return (
    <section>
      <h1 style={{ marginTop: 0 }}>Search</h1>
      <p style={{ color: "var(--muted)" }}>
        Keyword and optional semantic search apply department permissions in the API. An empty list does not reveal records outside your authorization.
      </p>
      <form onSubmit={onSubmit} className="mb-6 grid max-w-lg gap-2.5">
        <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Keyword" />
        <Select value={classCode} onChange={(event) => setClassCode(event.target.value)}>
          <option value="">Any class</option>
          <option value="government_circular">Government circular</option>
          <option value="contract">Contract</option>
          <option value="project_report">Project report</option>
          <option value="variation_order">Variation order</option>
        </Select>
        <Select value={languageCode} onChange={(event) => setLanguageCode(event.target.value)}>
          <option value="">Any language</option>
          <option value="en">English</option>
          <option value="ar">Arabic</option>
        </Select>
        {semanticAvailable ? (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={semantic} onChange={(event) => setSemantic(event.target.checked)} />
            Include semantic matches
          </label>
        ) : null}
        <Button type="submit">Search authorized records</Button>
      </form>
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      {emptyMessage ? <p style={{ color: "var(--muted)" }}>{emptyMessage}</p> : null}
      {results.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Match</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                tabIndex={0}
                onClick={() => onOpenDocument(row.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onOpenDocument(row.id);
                }}
              >
                <TableCell>{row.title}</TableCell>
                <TableCell>{row.classCode}</TableCell>
                <TableCell>{row.language}</TableCell>
                <TableCell>{row.currentVersion ?? "—"}</TableCell>
                <TableCell>{row.workflowState || "—"}</TableCell>
                <TableCell>{row.matchType ?? "keyword"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </section>
  );
}
