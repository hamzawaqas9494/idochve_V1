import { useTranslation } from "react-i18next";
import { LocaleLink } from "./LocaleLink";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Footer() {
  const { t } = useTranslation("common");

  return (
    <footer className="border-t border-white/10 bg-navy-950 px-6 py-14 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
        <div>
          <p className="text-sm font-semibold">{t("brand")}</p>
          <p className="mt-2 text-sm text-white/65">{t("footer.tagline")}</p>
          <p className="mt-3 text-sm text-teal-600">{t("footer.promise")}</p>
        </div>
        <div className="text-sm text-white/70">
          <p>{t("footer.owner")}</p>
          <p className="mt-2">{t("footer.iso")}</p>
          <p className="mt-3">
            <a className="underline-offset-2 hover:underline" href="mailto:business@idochive.com">
              {t("footer.contact")}
            </a>
          </p>
          <p className="mt-2">{t("footer.phones.sa")}</p>
          <p>{t("footer.phones.us")}</p>
          <p>{t("footer.phones.pk")}</p>
        </div>
        <div className="flex flex-col items-start gap-4">
          <nav className="flex flex-col gap-2 text-sm">
            <LocaleLink to="/how-it-works">{t("nav.how")}</LocaleLink>
            <LocaleLink to="/deployment">{t("nav.deployment")}</LocaleLink>
            <LocaleLink to="/government">{t("nav.government")}</LocaleLink>
            <LocaleLink to="/book">{t("nav.book")}</LocaleLink>
            <LocaleLink to="/privacy">{t("nav.privacy")}</LocaleLink>
          </nav>
          <LanguageSwitcher />
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-xs text-white/40">{t("footer.rights")}</p>
    </footer>
  );
}
