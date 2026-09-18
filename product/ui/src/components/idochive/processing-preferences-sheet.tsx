import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

export function ProcessingPreferencesSheet({
  open,
  onOpenChange,
  classCode,
  languageCode,
  department,
  onClassCode,
  onLanguageCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classCode: string;
  languageCode: string;
  department: string;
  onClassCode: (value: string) => void;
  onLanguageCode: (value: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetTitle>Processing preferences</SheetTitle>
        <SheetDescription>
          Optional settings for advanced users. Upload starts without them, and these apply to the next upload.
        </SheetDescription>
        <ScrollArea className="mt-5 h-[calc(100dvh-9rem)] pe-2">
          <div className="grid gap-4">
            <Field label="Document class override" value={classCode} onChange={onClassCode}>
              <option value="project_report">Project report</option>
              <option value="government_circular">Government circular</option>
              <option value="contract">Contract</option>
              <option value="variation_order">Variation order</option>
            </Field>
            <Field label="Language override" value={languageCode} onChange={onLanguageCode}>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </Field>
          </div>
          <Separator className="my-5" />
          <p className="m-0 text-sm font-medium">Set by policy</p>
          <dl className="mt-3 grid grid-cols-[10rem_1fr] gap-2 text-sm">
            <dt className="text-[var(--muted)]">Destination collection</dt>
            <dd className="m-0">{department}</dd>
            <dt className="text-[var(--muted)]">OCR engine</dt>
            <dd className="m-0">Tesseract</dd>
            <dt className="text-[var(--muted)]">Confidence threshold</dt>
            <dd className="m-0">Low confidence is sent to validation</dd>
            <dt className="text-[var(--muted)]">Duplicate handling</dt>
            <dd className="m-0">Checksum is recorded with every original</dd>
            <dt className="text-[var(--muted)]">Retention policy</dt>
            <dd className="m-0">Follows the collection policy</dd>
            <dt className="text-[var(--muted)]">Workflow assignment</dt>
            <dd className="m-0">Routed automatically after extraction</dd>
          </dl>
          <p className="mt-4 text-xs text-[var(--muted)]">
            Permissions follow the document through OCR and search. Every ingestion, OCR, approval, and access event is
            logged.
          </p>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <Label>
      {label}
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </Select>
    </Label>
  );
}
