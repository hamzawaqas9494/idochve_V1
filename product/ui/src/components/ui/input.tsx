import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--white)] px-3 text-sm text-[var(--ink)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
