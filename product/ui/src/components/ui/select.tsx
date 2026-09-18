import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "min-h-11 rounded-md border border-[var(--border)] bg-[var(--white)] px-3 text-sm text-[var(--ink)]",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
