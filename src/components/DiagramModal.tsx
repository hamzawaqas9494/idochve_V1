import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  onClose: () => void;
};

const layers = [
  { title: "Experience", detail: "Vue 3 with Inertia · search · viewer · workflow inbox · administration" },
  { title: "Application and policy", detail: "Laravel modular monolith · APIs · RBAC · workflow · audit enforcement" },
  { title: "Document intelligence", detail: "OCR gateway · classification · extraction · validation" },
  { title: "Knowledge and AI", detail: "LangGraph · embeddings · vLLM behind an internal model gateway" },
  { title: "Data", detail: "PostgreSQL system of record · pgvector embeddings · object storage for originals · OpenSearch only when enterprise search scale requires it" },
  { title: "Integration and security", detail: "Identity provider · SIEM · backup · signed offline updates" },
];

export function DiagramModal({ open, onClose }: Props) {
  const { t } = useTranslation("common");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-navy-950/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="arch-title"
        className="mx-auto my-8 max-w-2xl rounded-2xl bg-white p-6 text-ink"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="arch-title" className="text-lg font-semibold">
          {t("diagram.zoom")}
        </h2>
        <ol className="mt-5 space-y-3">
          {layers.map((layer) => (
            <li key={layer.title} className="rounded-xl border border-border p-4">
              <p className="text-sm font-semibold">{layer.title}</p>
              <p className="mt-1 text-sm text-muted">{layer.detail}</p>
            </li>
          ))}
        </ol>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex min-h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold"
        >
          {t("diagram.close")}
        </button>
      </div>
    </div>
  );
}
