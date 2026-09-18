import { Button } from "@/components/ui/button";

export function IngestionPagination({
  shown,
  total,
  page,
  pageCount,
  onPage,
}: {
  shown: number;
  total: number;
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="m-0 text-sm text-[var(--muted)]">
        Showing {shown} of {total} items
      </p>
      <div className="flex flex-wrap gap-1">
        <Button type="button" variant="outline" size="sm" disabled={page === 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        {pages.map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={item === page ? "default" : "outline"}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onPage(item)}
          >
            {item}
          </Button>
        ))}
        <Button type="button" variant="outline" size="sm" disabled={page === pageCount} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
