import { type ComponentProps } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";

function Command({ className, ...props }: ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      className={cn("flex h-full w-full flex-col overflow-hidden rounded-xl bg-[var(--white)]", className)}
      {...props}
    />
  );
}

function CommandInput({ className, ...props }: ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <CommandPrimitive.Input
      className={cn("min-h-11 w-full border-b border-[var(--border)] px-3 text-sm outline-none", className)}
      {...props}
    />
  );
}

function CommandList({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) {
  return <CommandPrimitive.List className={cn("max-h-72 overflow-auto p-1", className)} {...props} />;
}

function CommandItem({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn("flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm data-[selected=true]:bg-[var(--paper-50)]", className)}
      {...props}
    />
  );
}

function CommandEmpty({ className, ...props }: ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty className={cn("px-3 py-6 text-sm text-[var(--muted)]", className)} {...props} />;
}

export { Command, CommandInput, CommandList, CommandItem, CommandEmpty };
