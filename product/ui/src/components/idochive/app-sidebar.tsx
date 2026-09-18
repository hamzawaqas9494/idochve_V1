import {
  FileText,
  FolderOpen,
  Home,
  Search,
  Sparkles,
  ShieldCheck,
  GitBranch,
  ScrollText,
  Database,
  ChevronDown,
  Inbox,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AppRoute } from "@/lib/app-route";
import type { User } from "@/api";

export function AppSidebar({
  user,
  route,
  reviewCount,
  onNavigate,
  onLogout,
  className = "",
}: {
  user: User;
  route: AppRoute;
  reviewCount: number;
  onNavigate: (route: AppRoute) => void;
  onLogout: () => void;
  className?: string;
}) {
  const documentsOpen = true;
  const initials = initialsFrom(user.fullName);

  return (
    <aside className={`flex h-dvh w-[16.25rem] shrink-0 flex-col bg-[var(--navy-950)] text-[var(--white)] ${className}`}>
      <div className="px-5 py-5">
        <p className="m-0 text-base font-semibold">iDocHive</p>
        <p className="mt-1 text-xs text-[var(--teal-600)]">Sovereign document intelligence</p>
      </div>
      <nav className="grid gap-1 px-3" aria-label="Primary">
        <NavButton active={route === "home"} icon={Home} label="Home" onClick={() => onNavigate("home")} />
        <button
          type="button"
          className={`flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-start text-sm ${
            documentsOpen ? "bg-[var(--navy-900)]" : ""
          }`}
          onClick={() => onNavigate("ingestion")}
          aria-expanded={documentsOpen}
        >
          <FolderOpen className="size-4" aria-hidden="true" />
          Documents
          <ChevronDown className={`ms-auto size-4 transition-transform duration-150 ${documentsOpen ? "" : "-rotate-90"}`} />
        </button>
        {documentsOpen ? (
          <div className="ms-6 grid gap-1">
            <NavButton active={route === "documents" || route === "viewer"} icon={FileText} label="All Documents" onClick={() => onNavigate("documents")} />
            <NavButton active={route === "ingestion"} icon={Inbox} label="Ingestion" onClick={() => onNavigate("ingestion")} />
          </div>
        ) : null}
        <NavButton active={route === "search"} icon={Search} label="Search" onClick={() => onNavigate("search")} />
        <NavButton active={route === "intelligence"} icon={Sparkles} label="Intelligence" onClick={() => onNavigate("intelligence")} />
        <NavButton
          active={route === "validation"}
          icon={ShieldCheck}
          label="Validation"
          badge={reviewCount}
          onClick={() => onNavigate("validation")}
        />
        <NavButton active={route === "workflows"} icon={GitBranch} label="Workflows" onClick={() => onNavigate("workflows")} />
        <NavButton active={route === "audit"} icon={ScrollText} label="Audit" onClick={() => onNavigate("audit")} />
        <NavButton active={route === "backup"} icon={Database} label="Backup" onClick={() => onNavigate("backup")} />
      </nav>
      <div className="mt-auto border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="m-0 truncate text-sm font-medium">{user.fullName}</p>
            <p className="m-0 truncate text-xs text-[var(--border)]">{roleLabel(user.roles)}</p>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-[var(--success)]">
          <span className="size-2 rounded-full bg-[var(--success)]" aria-hidden="true" />
          Production Environment
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full border-white/20 bg-transparent text-[var(--white)]"
          onClick={onLogout}
        >
          Sign out
        </Button>
      </div>
    </aside>
  );
}

function NavButton({
  active,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  icon: typeof Home;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-start text-sm ${
        active ? "bg-[var(--blue-600)]" : "hover:bg-white/5"
      }`}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span className="flex-1">{label}</span>
      {badge ? (
        <Badge variant="danger" className="min-w-5 justify-center px-1.5 text-[10px] text-[var(--white)]">
          {badge}
        </Badge>
      ) : null}
    </button>
  );
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "A") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "R")).toUpperCase();
}

function roleLabel(roles: string[]) {
  if (roles.includes("admin") || roles.includes("approver")) return "Administrator";
  return (roles[0] ?? "Standard access").replaceAll("_", " ");
}
