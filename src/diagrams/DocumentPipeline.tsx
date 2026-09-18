import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const docs = ["paper", "arabic", "pdf", "contract", "report", "scan"] as const;
const stages = ["paper", "data", "information", "intelligence"] as const;

export function DocumentPipeline() {
  const { t } = useTranslation("home");
  const { t: tc } = useTranslation("common");
  const [step, setStep] = useState(0);
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) {
      setStep(3);
      return;
    }
    const id = window.setInterval(() => {
      setStep((current) => (current + 1) % 4);
    }, 3200);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-900/70 p-4 shadow-2xl sm:p-6">
      <ol className="mb-5 grid grid-cols-4 gap-2 text-center text-[0.65rem] font-semibold tracking-wide text-white/55 uppercase sm:text-xs">
        {stages.map((stage, index) => (
          <li
            key={stage}
            className={`rounded-md px-1 py-2 ${step >= index ? "bg-white/8 text-white" : ""}`}
          >
            {t(`pipeline.${stage}`)}
          </li>
        ))}
      </ol>

      <div className="relative overflow-hidden rounded-xl bg-navy-950 p-3">
        <div className="mb-4 flex flex-wrap gap-2">
          {docs.map((doc, index) => (
            <span
              key={doc}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] text-white/80"
              style={{
                transform: `translateX(${reduced ? 0 : step * 4}px)`,
                opacity: 0.55 + ((index + step) % 3) * 0.15,
              }}
            >
              {t(`pipeline.docs.${doc}`)}
            </span>
          ))}
        </div>

        <div className="grid gap-2 text-sm">
          <p className="rounded-lg bg-white/5 px-3 py-2 text-white">{t("pipeline.end.answer")}</p>
          <p className="font-mono text-[0.7rem] text-teal-600">{t("pipeline.end.citation")}</p>
          <div className="flex flex-wrap gap-2 text-[0.7rem]">
            <span className="rounded-full bg-blue-600/20 px-2 py-1 text-blue-200">
              {t("pipeline.end.permission")}
            </span>
            <span className="rounded-full bg-violet-600/20 px-2 py-1 text-violet-200">
              {step < 3 ? tc("status.pending") : t("pipeline.end.review")}
            </span>
            <span className="rounded-full bg-success/20 px-2 py-1 text-emerald-200">
              {step === 3 ? t("pipeline.end.audit") : tc("status.pending")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
