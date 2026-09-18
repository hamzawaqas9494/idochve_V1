import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import type { Locale } from "./locale";

const siteUrl = import.meta.env.VITE_SITE_URL ?? "https://idochive.com";

const pageKeys = {
  home: "home",
  how: "how",
  deployment: "deployment",
  government: "government",
  book: "book",
  privacy: "privacy",
} as const;

type PageKey = keyof typeof pageKeys;

export function Seo({ page, path }: { page: PageKey; path: string }) {
  const { t, i18n } = useTranslation("seo");
  const locale = i18n.language as Locale;
  const title = t(`${pageKeys[page]}.title`);
  const description = t(`${pageKeys[page]}.description`);
  const enUrl = `${siteUrl}${path === "/" ? "" : path}`;
  const arPath = path === "/" ? "/ar" : `/ar${path}`;
  const arUrl = `${siteUrl}${arPath}`;
  const canonical = locale === "ar" ? arUrl : enUrl;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "iDocHive",
      url: siteUrl,
      email: "business@idochive.com",
      parentOrganization: { "@type": "Organization", name: "Creation Next" },
      description:
        "Governed enterprise document and knowledge intelligence layer for sovereign AI.",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "iDocHive",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Customer-controlled infrastructure",
      description:
        "Sovereign document and knowledge intelligence for on-premise, private, and air-gapped environments.",
      offers: {
        "@type": "Offer",
        availability: "https://schema.org/InStoreOnly",
        description: "Enterprise license and implementation. No public self-service signup.",
      },
    },
  ];

  return (
    <Helmet>
      <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <link rel="alternate" hrefLang="en" href={enUrl} />
      <link rel="alternate" hrefLang="ar" href={arUrl} />
      <link rel="alternate" hrefLang="x-default" href={enUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={`${siteUrl}/og.svg`} />
      <meta name="twitter:card" content="summary_large_image" />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
