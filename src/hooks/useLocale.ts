import { useLocation } from "react-router";
import { localeFromPath, type Locale } from "@/lib/locale";

export function useLocale(): Locale {
  return localeFromPath(useLocation().pathname);
}
