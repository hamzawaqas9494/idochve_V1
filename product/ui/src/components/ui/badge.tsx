import { type ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", {
  variants: {
    variant: {
      active: "border-transparent bg-[var(--paper-50)] text-[var(--teal-600)]",
      review: "border-transparent bg-[var(--paper-50)] text-[var(--violet-600)]",
      ready: "border-transparent bg-[var(--paper-50)] text-[var(--success)]",
      amber: "border-transparent bg-[var(--paper-50)] text-[var(--amber)]",
      danger: "border-transparent bg-[var(--danger)] text-[var(--white)]",
      muted: "border-[var(--border)] text-[var(--muted)]",
    },
  },
  defaultVariants: {
    variant: "muted",
  },
});

function Badge({ className, variant, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
