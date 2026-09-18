import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-[var(--border)] bg-[var(--white)] p-5", className)} {...props} />;
}

export { Card };
