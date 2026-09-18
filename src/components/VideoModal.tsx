import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LocaleLink } from "./LocaleLink";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function VideoModal({ open, onClose }: Props) {
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
    <div className="fixed inset-0 z-[60] grid place-items-center bg-navy-950/70 p-4" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-title"
        className="w-full max-w-lg rounded-2xl bg-white p-6 text-ink shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="demo-title" className="text-lg font-semibold">
          {t("video.title")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{t("video.unavailable")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <LocaleLink
            to="/book"
            className="inline-flex min-h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"
          >
            {t("cta.book")}
          </LocaleLink>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center rounded-lg border border-border px-4 text-sm font-semibold"
          >
            {t("video.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
