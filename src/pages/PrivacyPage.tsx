import { useTranslation } from "react-i18next";
import { Seo } from "@/lib/seo";

export function PrivacyPage() {
  const { t } = useTranslation("common");

  return (
    <>
      <Seo page="privacy" path="/privacy" />
      <section className="bg-navy-950 px-6 pt-28 pb-16 text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight">{t("privacy.title")}</h1>
        </div>
      </section>
      <section className="px-6 py-16">
        <p className="mx-auto max-w-3xl text-base leading-relaxed text-muted">{t("privacy.body")}</p>
      </section>
    </>
  );
}
