import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="relative w-full overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--white)]">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("bg-[var(--paper-50)]", className)} {...props} />;
}

function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

const TableRow = forwardRef<HTMLTableRowElement, ComponentProps<"tr">>(function TableRow(
  { className, ...props },
  ref,
) {
  return <tr ref={ref} className={cn("border-b border-[var(--border)]", className)} {...props} />;
});

function TableHead({ className, ...props }: ComponentProps<"th">) {
  return <th className={cn("h-11 px-3 text-start font-medium text-[var(--muted)]", className)} {...props} />;
}

function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("p-3 align-middle", className)} {...props} />;
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
