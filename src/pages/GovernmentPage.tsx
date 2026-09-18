import { useTranslation } from "react-i18next";
import { Seo } from "@/lib/seo";
import { SectionHeading } from "@/components/SectionHeading";
import { CtaSection } from "@/components/CtaSection";

export function GovernmentPage() {
  const { t } = useTranslation("government");
  const { t: th } = useTranslation("home");
  const segments = t("segments", { returnObjects: true }) as { title: string; text: string }[];
  const journey = t("journey.steps", { returnObjects: true }) as string[];
  const concerns = t("concerns.items", { returnObjects: true }) as { title: string; text: string }[];
  const controls = t("controls.items", { returnObjects: true }) as { title: string; text: string }[];

  return (
    <>
      <Seo page="government" path="/government" />
      <section className="bg-navy-950 px-6 pt-28 pb-16 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-teal-600 uppercase">{t("eyebrow")}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">{t("headline")}</h1>
          <p className="mt-4 text-white/70">{t("body")}</p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          {segments.map((item) => (
            <article key={item.title} className="rounded-2xl border border-border bg-white p-6">
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-muted">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white px-6 py-16">
        <SectionHeading title={t("journey.headline")} />
        <ol className="mx-auto mt-8 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {journey.map((step, index) => (
            <li key={step} className="rounded-xl border border-border px-4 py-3 text-sm">
              <span className="font-mono text-xs text-teal-600">{String(index + 1).padStart(2, "0")}</span>
              <p className="mt-1 font-medium">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="px-6 py-16">
        <SectionHeading title={t("concerns.headline")} />
        <div className="mx-auto mt-8 grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-3">
          {concerns.map((item) => (
            <article key={item.title} className="rounded-2xl border border-border bg-white p-6">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white px-6 py-16">
        <SectionHeading title={t("controls.headline")} body={t("controls.body")} />
        <div className="mx-auto mt-8 grid max-w-6xl gap-4 md:grid-cols-2">
          {controls.map((item) => (
            <article key={item.title} className="rounded-2xl border border-border p-6">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <CtaSection headline={th("final.headline")} body={th("final.body")} />
    </>
  );
}
