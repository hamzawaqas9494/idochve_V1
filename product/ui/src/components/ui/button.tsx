import { type ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue-600)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--blue-600)] text-[var(--white)] hover:opacity-90",
        teal: "bg-[var(--teal-600)] text-[var(--white)] hover:opacity-90",
        outline: "border border-[var(--border)] bg-[var(--white)] text-[var(--ink)] hover:bg-[var(--paper-50)]",
        ghost: "text-[var(--ink)] hover:bg-[var(--paper-50)]",
        link: "text-[var(--blue-600)] underline-offset-4 hover:underline px-0",
        destructive: "bg-[var(--danger)] text-[var(--white)] hover:opacity-90",
      },
      size: {
        default: "min-h-11 px-4",
        sm: "min-h-9 px-3 text-xs",
        icon: "min-h-11 min-w-11 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
