import { Link, type LinkProps } from "react-router";
import { useLocale } from "@/hooks/useLocale";
import { localizePath } from "@/lib/locale";

export function LocaleLink({ to, ...props }: LinkProps) {
  const locale = useLocale();
  const href = typeof to === "string" ? localizePath(to, locale) : to;
  return <Link to={href} {...props} />;
}
