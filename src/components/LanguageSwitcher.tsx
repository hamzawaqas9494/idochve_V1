import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { localizePath, stripLocale } from "@/lib/locale";
import { useLocale } from "@/hooks/useLocale";

export function LanguageSwitcher() {
  const { t } = useTranslation("common");
  const locale = useLocale();
  const navigate = useNavigate();
  const { pathname, hash } = useLocation();

  function switchTo(next: "en" | "ar") {
    navigate(`${localizePath(stripLocale(pathname), next)}${hash}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-current/15 p-1 text-xs font-medium">
      <button
        type="button"
        onClick={() => switchTo("en")}
        className={`rounded-full px-2.5 py-1 ${locale === "en" ? "bg-current/10" : "opacity-70 hover:opacity-100"}`}
        aria-pressed={locale === "en"}
      >
        {t("lang.en")}
      </button>
      <button
        type="button"
        onClick={() => switchTo("ar")}
        className={`rounded-full px-2.5 py-1 ${locale === "ar" ? "bg-current/10" : "opacity-70 hover:opacity-100"}`}
        aria-pressed={locale === "ar"}
      >
        {t("lang.ar")}
      </button>
    </div>
  );
}
