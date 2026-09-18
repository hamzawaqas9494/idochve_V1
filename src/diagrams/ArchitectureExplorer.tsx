import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DiagramModal } from "@/components/DiagramModal";

const layerIds = ["access", "policy", "inference", "data", "security"] as const;

export function ArchitectureExplorer() {
  const { t } = useTranslation("home");
  const { t: tc } = useTranslation("common");
  const [active, setActive] = useState<(typeof layerIds)[number]>("data");
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="grid gap-3 lg:grid-cols-5">
        {layerIds.map((id) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={`rounded-xl border p-4 text-start transition ${
                selected
                  ? "border-blue-600 bg-blue-600/8"
                  : "border-border bg-white hover:border-blue-600/40"
              }`}
              aria-pressed={selected}
            >
              <span className="block text-sm font-semibold text-ink">{t(`architecture.layers.${layerIndex(id)}.title`)}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted">
        {t(`architecture.layers.${layerIndex(active)}.text`)}
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 text-sm font-semibold text-blue-600 underline-offset-2 hover:underline"
      >
        {tc("diagram.open")}
      </button>
      <DiagramModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function layerIndex(id: (typeof layerIds)[number]) {
  return layerIds.indexOf(id);
}
