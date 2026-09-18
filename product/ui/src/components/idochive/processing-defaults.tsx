import { CheckCircle2, ChevronRight, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";

const defaults = ["Auto-detect language", "Auto-classify document", "Start OCR after upload"];

export function ProcessingDefaults({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 py-4">
        {defaults.map((item) => (
          <p key={item} className="m-0 inline-flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-[var(--success)]" aria-hidden="true" />
            {item}
          </p>
        ))}
      </Card>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--white)] px-4 text-start"
      >
        <Settings className="size-4 text-[var(--muted)]" aria-hidden="true" />
        <span>
          <span className="block text-sm font-medium">Processing preferences</span>
          <span className="block text-xs text-[var(--muted)]">Optional settings for advanced users</span>
        </span>
        <ChevronRight className="ms-auto size-4 rtl:rotate-180" aria-hidden="true" />
      </button>
    </div>
  );
}
