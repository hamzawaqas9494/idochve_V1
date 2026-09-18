import { Bell, Menu, Search, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AppRoute } from "@/lib/app-route";
import type { User } from "@/api";

const crumbs: Partial<Record<AppRoute, string[]>> = {
  home: ["Home"],
  documents: ["Documents", "All Documents"],
  viewer: ["Documents", "Viewer"],
  ingestion: ["Documents", "Ingestion"],
  search: ["Search"],
  intelligence: ["Intelligence"],
  validation: ["Validation"],
  workflows: ["Workflows"],
  backup: ["Backup"],
  audit: ["Audit"],
};

export function AppHeader({
  user,
  route,
  onSearch,
  onOpenMobileNav,
}: {
  user: User;
  route: AppRoute;
  onSearch: () => void;
  onOpenMobileNav: () => void;
}) {
  const trail = crumbs[route] ?? ["Home"];
  const initials = (user.fullName.split(/\s+/).map((part) => part[0]).join("") || "AR").slice(0, 2).toUpperCase();

  return (
    <header className="flex min-h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--white)] px-4">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMobileNav} aria-label="Open navigation">
        <Menu className="size-4" />
      </Button>
      <Breadcrumb className="hidden sm:flex">
        <BreadcrumbList>
          {trail.map((item, index) => (
            <BreadcrumbItem key={item}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              {index === trail.length - 1 ? <BreadcrumbPage>{item}</BreadcrumbPage> : <span>{item}</span>}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <button
        type="button"
        onClick={onSearch}
        className="mx-auto flex min-h-11 w-full max-w-md items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--paper-50)] px-3 text-start text-sm text-[var(--muted)]"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="flex-1 truncate">Search documents, jobs, or anything...</span>
        <kbd className="hidden rounded border border-[var(--border)] bg-[var(--white)] px-1.5 text-[10px] sm:inline">⌘ K</kbd>
      </button>
      <TooltipProvider>
        <div className="ms-auto flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Settings">
                <Settings className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
          <Avatar className="ms-1 size-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </div>
      </TooltipProvider>
    </header>
  );
}

