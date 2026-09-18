import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("grid gap-1.5 text-sm", className)} {...props} />;
}

export { Label };
