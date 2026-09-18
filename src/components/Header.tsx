import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { LocaleLink } from "./LocaleLink";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { stripLocale } from "@/lib/locale";

const links = [
  { to: "/how-it-works", key: "nav.how" },
  { to: "/deployment", key: "nav.deployment" },
  { to: "/#use-cases", key: "nav.solutions" },
  { to: "/deployment", key: "nav.security", hashMatch: true },
] as const;

export function Header() {
  const { t } = useTranslation("common");
  const { pathname, hash } = useLocation();
  const path = stripLocale(pathname);
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const isHome = path === "/";

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname, hash]);

  const overHero = isHome && !solid;
  const tone = overHero ? "text-white" : "text-ink";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        overHero ? "bg-transparent" : "border-b border-border bg-white/95 backdrop-blur"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-[4.25rem] sm:px-6">
        <LocaleLink to="/" className={`flex items-center gap-2.5 ${tone}`}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy-950 text-[0.7rem] font-bold text-white">
            iD
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">{t("brand")}</span>
            <span className={`block text-[0.65rem] ${overHero ? "text-white/60" : "text-muted"}`}>
              {t("logoLine")}
            </span>
          </span>
        </LocaleLink>

        <nav className={`hidden items-center gap-6 text-sm font-medium lg:flex ${tone}`}>
          {links.map((link) => {
            const active =
              link.to === "/#use-cases"
                ? hash === "#use-cases"
                : path === link.to || (link.to === "/deployment" && path === "/deployment");
            return (
              <LocaleLink
                key={link.key}
                to={link.to}
                className={`relative py-1 ${active ? "text-blue-600" : "opacity-80 hover:opacity-100"}`}
              >
                {t(link.key)}
                {active ? <span className="absolute inset-x-0 -bottom-1 h-px bg-blue-600" /> : null}
              </LocaleLink>
            );
          })}
        </nav>

        <div className={`hidden items-center gap-3 lg:flex ${tone}`}>
          <LanguageSwitcher />
          <LocaleLink
            to="/book"
            className="inline-flex min-h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"
          >
            {t("cta.book")}
          </LocaleLink>
        </div>

        <button
          type="button"
          className={`lg:hidden ${tone}`}
          aria-expanded={open}
          aria-label={open ? t("closeMenu") : t("menu")}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? t("closeMenu") : t("menu")}</span>
          <span className="flex h-10 w-10 flex-col items-center justify-center gap-1.5">
            <span className={`h-px w-5 bg-current ${open ? "translate-y-[3.5px] rotate-45" : ""}`} />
            <span className={`h-px w-5 bg-current ${open ? "opacity-0" : ""}`} />
            <span className={`h-px w-5 bg-current ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`} />
          </span>
        </button>
      </div>

      {open ? (
        <div className="border-t border-border bg-white px-4 py-4 text-ink lg:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium">
            {links.map((link) => (
              <LocaleLink key={link.key} to={link.to} className="py-2">
                {t(link.key)}
              </LocaleLink>
            ))}
            <LanguageSwitcher />
            <LocaleLink
              to="/book"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-white"
            >
              {t("cta.book")}
            </LocaleLink>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
