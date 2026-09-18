import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import i18n from "@/i18n";
import { localeFromPath } from "@/lib/locale";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function AppShell() {
  const { pathname } = useLocation();
  const locale = localeFromPath(pathname);

  useEffect(() => {
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-paper-50">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        {i18n.t("skip")}
      </a>
      <Header />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
