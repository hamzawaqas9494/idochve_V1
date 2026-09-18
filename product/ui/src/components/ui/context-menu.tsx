import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { cn } from "@/lib/utils";

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

function ContextMenuContent({ className, ...props }: ContextMenuPrimitive.ContextMenuContentProps) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        className={cn(
          "z-50 min-w-48 rounded-md border border-[var(--border)] bg-[var(--white)] p-1 shadow-md",
          className,
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

function ContextMenuItem({ className, ...props }: ContextMenuPrimitive.ContextMenuItemProps) {
  return (
    <ContextMenuPrimitive.Item
      className={cn(
        "flex min-h-11 cursor-pointer items-center rounded-sm px-3 text-sm outline-none data-disabled:opacity-50 data-highlighted:bg-[var(--paper-50)]",
        className,
      )}
      {...props}
    />
  );
}

export { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem };
