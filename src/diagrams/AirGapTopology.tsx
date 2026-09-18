import { useTranslation } from "react-i18next";

export function AirGapTopology() {
  const { t } = useTranslation("deployment");
  const nodes = t("topology.nodes", { returnObjects: true }) as string[];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-navy-950 p-5 text-white">
      <p className="text-xs font-semibold tracking-[0.16em] text-teal-600 uppercase">
        {t("topology.headline")}
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {nodes.map((node, index) => {
          const isolated = index === nodes.length - 1;
          return (
            <div
              key={node}
              className={`rounded-xl border px-3 py-3 text-sm ${
                isolated
                  ? "border-danger/40 bg-danger/10 text-red-100"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <span className="font-mono text-[0.65rem] text-white/40">{String(index + 1).padStart(2, "0")}</span>
              <p className="mt-1">{node}</p>
            </div>
          );
        })}
      </div>
      <svg className="mt-6 h-2 w-full" viewBox="0 0 400 8" aria-hidden="true">
        <line x1="8" y1="4" x2="392" y2="4" stroke="#0F9AA8" strokeWidth="2" strokeDasharray="6 8" />
      </svg>
    </div>
  );
}
