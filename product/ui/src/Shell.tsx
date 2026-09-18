import { useEffect, useState } from "react";
import type { User } from "./api";
import { AppHeader } from "@/components/idochive/app-header";
import { AppSidebar } from "@/components/idochive/app-sidebar";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { locationFromWindow, pathFor, type AppRoute } from "@/lib/app-route";
import { useIngestionJobs } from "@/lib/ingestion/use-ingestion-jobs";
import { AuditPage } from "./pages/AuditPage";
import { BackupPage } from "./pages/BackupPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { HomePage } from "./pages/HomePage";
import { IngestionCenterPage } from "./pages/IngestionCenterPage";
import { IntelligencePage } from "./pages/IntelligencePage";
import { SearchPage } from "./pages/SearchPage";
import { ValidationPage } from "./pages/ValidationPage";
import { ViewerPage } from "./pages/ViewerPage";
import { WorkflowsPage } from "./pages/WorkflowsPage";

export function Shell({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [location, setLocation] = useState(() => locationFromWindow());
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const queue = useIngestionJobs();

  useEffect(() => {
    const onPop = () => setLocation(locationFromWindow());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function navigate(route: AppRoute, documentId?: string, page?: number, replace = false) {
    const next = hrefFor(route, documentId, page);
    if (replace) {
      window.history.replaceState({}, "", next);
    } else {
      window.history.pushState({}, "", next);
    }
    setLocation({ route, documentId, page });
    setMobileNav(false);
  }

  return (
    <div className="flex min-h-dvh bg-[var(--paper-50)]">
      <AppSidebar
        user={user}
        route={location.route}
        reviewCount={queue.counts.review}
        onNavigate={navigate}
        onLogout={onLogout}
        className="hidden lg:flex"
      />
      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent side="left" className="w-[16.25rem] bg-[var(--navy-950)] p-0 text-[var(--white)]">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppSidebar
            user={user}
            route={location.route}
            reviewCount={queue.counts.review}
            onNavigate={navigate}
            onLogout={onLogout}
          />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          user={user}
          route={location.route}
          onSearch={() => setCommandOpen(true)}
          onOpenMobileNav={() => setMobileNav(true)}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-7">
          {location.route === "home" ? <HomePage /> : null}
          {location.route === "documents" ? (
            <DocumentsPage onOpenDocument={(documentId) => navigate("viewer", documentId)} />
          ) : null}
          {location.route === "viewer" ? (
            <ViewerPage
              key={location.documentId}
              documentId={location.documentId}
              page={location.page ?? 1}
              onPage={(page) => navigate("viewer", location.documentId, page, true)}
            />
          ) : null}
          {location.route === "ingestion" ? (
            <IngestionCenterPage
              user={user}
              serverJobs={queue.jobs}
              serverCounts={queue.counts}
              canTick={queue.canTick}
              queueUp={queue.queueUp}
              loadError={queue.error}
              loaded={queue.loaded}
              refresh={queue.refresh}
              commandOpen={commandOpen}
              onCommandOpen={setCommandOpen}
              onOpenValidation={(documentId) => navigate("validation", documentId)}
              onOpenViewer={(documentId) => navigate("viewer", documentId)}
              onOpenAudit={() => navigate("audit")}
            />
          ) : null}
          {location.route === "search" ? (
            <SearchPage onOpenDocument={(documentId) => navigate("viewer", documentId)} />
          ) : null}
          {location.route === "intelligence" ? (
            <IntelligencePage onOpenDocument={(documentId, page) => navigate("viewer", documentId, page)} />
          ) : null}
          {location.route === "validation" ? <ValidationPage documentId={location.documentId} /> : null}
          {location.route === "workflows" ? <WorkflowsPage /> : null}
          {location.route === "backup" ? <BackupPage /> : null}
          {location.route === "audit" ? <AuditPage /> : null}
        </main>
      </div>
      {location.route !== "ingestion" ? (
        <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
          <DialogContent className="p-0">
            <DialogTitle className="sr-only">Search documents, jobs, or anything</DialogTitle>
            <Command>
              <CommandInput placeholder="Search documents, jobs, or anything..." />
              <CommandList>
                <CommandEmpty>No authorized records match.</CommandEmpty>
                {(["home", "documents", "ingestion", "search", "intelligence", "validation", "workflows", "audit", "backup"] as AppRoute[]).map((item) => (
                  <CommandItem
                    key={item}
                    onSelect={() => {
                      navigate(item);
                      setCommandOpen(false);
                    }}
                  >
                    {item === "ingestion" ? "Ingestion Center" : item[0].toUpperCase() + item.slice(1)}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function hrefFor(route: AppRoute, documentId?: string, page?: number) {
  const path = pathFor(route, documentId, page);
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (window.location.pathname.startsWith("/www")) {
    return path === "/" ? `${base}/` : `${base}${path}`;
  }
  return path;
}
