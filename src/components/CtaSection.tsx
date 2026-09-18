import { useTranslation } from "react-i18next";
import { LocaleLink } from "./LocaleLink";

type Props = {
  headline: string;
  body: string;
};

export function CtaSection({ headline, body }: Props) {
  const { t } = useTranslation("common");

  return (
    <section className="bg-navy-950 px-6 py-20 text-white sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{headline}</h2>
        <p className="mt-4 text-base text-white/70 sm:text-lg">{body}</p>
        <LocaleLink
          to="/book"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-600/90"
        >
          {t("cta.book")}
        </LocaleLink>
      </div>
    </section>
  );
}
