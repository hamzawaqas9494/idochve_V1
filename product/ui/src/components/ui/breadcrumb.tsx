import { type ComponentProps, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function Breadcrumb({ className, ...props }: ComponentProps<"nav">) {
  return <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-sm text-[var(--muted)]", className)} {...props} />;
}

function BreadcrumbList({ children }: { children: ReactNode }) {
  return <ol className="m-0 flex list-none items-center gap-1 p-0">{children}</ol>;
}

function BreadcrumbItem({ children }: { children: ReactNode }) {
  return <li className="flex items-center gap-1">{children}</li>;
}

function BreadcrumbSeparator() {
  return (
    <li aria-hidden="true">
      <ChevronRight className="size-3.5 rtl:rotate-180" />
    </li>
  );
}

function BreadcrumbPage({ children }: { children: ReactNode }) {
  return <span className="font-medium text-[var(--ink)]">{children}</span>;
}

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbSeparator, BreadcrumbPage };
