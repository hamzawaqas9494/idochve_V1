export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "ar";
}

export function localeFromPath(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];
  return first === "ar" ? "ar" : "en";
}

export function localizePath(pathname: string, locale: Locale): string {
  const [pathPart, hash] = pathname.split("#");
  const clean = pathPart.replace(/^\/ar(?=\/|$)/, "") || "/";
  const localized = locale === "ar" ? (clean === "/" ? "/ar" : `/ar${clean}`) : clean;
  return hash ? `${localized}#${hash}` : localized;
}

export function stripLocale(pathname: string): string {
  return pathname.replace(/^\/ar(?=\/|$)/, "") || "/";
}
