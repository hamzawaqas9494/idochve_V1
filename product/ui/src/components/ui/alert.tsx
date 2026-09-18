import { type ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("flex gap-3 rounded-xl border p-4 text-sm", {
  variants: {
    variant: {
      default: "border-[var(--border)] bg-[var(--white)] text-[var(--ink)]",
      success: "border-[var(--success)]/20 bg-[var(--success)]/8 text-[var(--success)]",
      warning: "border-[var(--amber)]/20 bg-[var(--amber)]/8 text-[var(--amber)]",
      danger: "border-[var(--danger)]/20 bg-[var(--danger)]/8 text-[var(--danger)]",
    },
  },
  defaultVariants: { variant: "default" },
});

function Alert({ className, variant, ...props }: ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

export { Alert };
