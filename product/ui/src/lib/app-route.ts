export type AppRoute =
  | "home"
  | "documents"
  | "viewer"
  | "ingestion"
  | "search"
  | "intelligence"
  | "validation"
  | "workflows"
  | "backup"
  | "audit";

export type AppLocation = {
  route: AppRoute;
  documentId?: string;
  page?: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const paths: Partial<Record<AppRoute, string>> = {
  home: "/",
  documents: "/documents",
  ingestion: "/documents/ingestion",
  search: "/search",
  intelligence: "/intelligence",
  validation: "/validation",
  workflows: "/workflows",
  backup: "/backup",
  audit: "/audit",
};

export function pathFor(route: AppRoute, documentId?: string, page?: number) {
  if (route === "viewer" && documentId) {
    const base = `/documents/${documentId}`;
    return page && page > 1 ? `${base}?page=${page}` : base;
  }
  if (route === "validation" && documentId) {
    return `/validation/${documentId}`;
  }
  return paths[route] ?? "/";
}

export function pageFromSearch(search: string) {
  const raw = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("page");
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page : undefined;
}

export function routeFromPath(pathname: string, search = ""): AppLocation {
  const path = pathname.replace(/^\/www/, "").replace(/\/+$/, "") || "/";
  const page = pageFromSearch(search);
  if (path.startsWith("/validation/")) {
    return { route: "validation", documentId: path.slice("/validation/".length), page };
  }
  if (path.startsWith("/documents/")) {
    const rest = path.slice("/documents/".length);
    if (rest === "ingestion") {
      return { route: "ingestion" };
    }
    if (UUID.test(rest)) {
      return { route: "viewer", documentId: rest, page };
    }
  }
  const found = (Object.entries(paths) as [AppRoute, string][]).find(([, value]) => value === path);
  return { route: found?.[0] ?? "home" };
}

export function locationFromWindow(): AppLocation {
  return routeFromPath(window.location.pathname, window.location.search);
}
