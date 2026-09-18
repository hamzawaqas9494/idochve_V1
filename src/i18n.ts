import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "./locales/en/common.json";
import enHome from "./locales/en/home.json";
import enHow from "./locales/en/howItWorks.json";
import enDeploy from "./locales/en/deployment.json";
import enGov from "./locales/en/government.json";
import enBook from "./locales/en/book.json";
import enSeo from "./locales/en/seo.json";
import arCommon from "./locales/ar/common.json";
import arHome from "./locales/ar/home.json";
import arHow from "./locales/ar/howItWorks.json";
import arDeploy from "./locales/ar/deployment.json";
import arGov from "./locales/ar/government.json";
import arBook from "./locales/ar/book.json";
import arSeo from "./locales/ar/seo.json";

void i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      home: enHome,
      howItWorks: enHow,
      deployment: enDeploy,
      government: enGov,
      book: enBook,
      seo: enSeo,
    },
    ar: {
      common: arCommon,
      home: arHome,
      howItWorks: arHow,
      deployment: arDeploy,
      government: arGov,
      book: arBook,
      seo: arSeo,
    },
  },
  lng: "en",
  fallbackLng: "en",
  ns: ["common", "home", "howItWorks", "deployment", "government", "book", "seo"],
  defaultNS: "common",
  interpolation: { escapeValue: false },
});

export default i18n;
