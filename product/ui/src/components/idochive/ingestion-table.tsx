import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IngestionJobCard } from "@/components/idochive/ingestion-job-card";
import { IngestionRow } from "@/components/idochive/ingestion-row";
import type { IngestionJob, JobAction } from "@/lib/ingestion/types";

export function IngestionTable({
  jobs,
  selected,
  onToggle,
  onToggleAll,
  onOpen,
  onReview,
  onView,
  onDownload,
  onAction,
  onAudit,
}: {
  jobs: IngestionJob[];
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onOpen: (job: IngestionJob) => void;
  onReview: (job: IngestionJob) => void;
  onView: (job: IngestionJob) => void;
  onDownload: (job: IngestionJob) => void;
  onAction: (job: IngestionJob, action: JobAction) => void;
  onAudit: (job: IngestionJob) => void;
}) {
  const allSelected = jobs.length > 0 && jobs.every((job) => selected.includes(job.id));

  return (
    <>
      <Card className="hidden overflow-hidden p-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(value) => onToggleAll(value === true)}
                  aria-label="Select all visible jobs"
                />
              </TableHead>
              <TableHead>File</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Estimated time</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <IngestionRow
                key={job.id}
                job={job}
                selected={selected.includes(job.id)}
                onToggle={onToggle}
                onOpen={() => onOpen(job)}
                onReview={() => onReview(job)}
                onView={() => onView(job)}
                onDownload={() => onDownload(job)}
                onAction={(action) => onAction(job, action)}
                onAudit={() => onAudit(job)}
              />
            ))}
          </TableBody>
        </Table>
      </Card>
      <div className="grid gap-3 md:hidden">
        {jobs.map((job) => (
          <IngestionJobCard
            key={job.id}
            job={job}
            selected={selected.includes(job.id)}
            onToggle={onToggle}
            onOpen={() => onOpen(job)}
            onReview={() => onReview(job)}
            onView={() => onView(job)}
            onDownload={() => onDownload(job)}
            onAction={(action) => onAction(job, action)}
            onAudit={() => onAudit(job)}
          />
        ))}
      </div>
    </>
  );
}
