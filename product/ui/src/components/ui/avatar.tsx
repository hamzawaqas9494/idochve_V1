import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

function Avatar({ className, ...props }: AvatarPrimitive.AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn("flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--navy-900)] text-xs font-medium text-[var(--white)]", className)}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: AvatarPrimitive.AvatarFallbackProps) {
  return <AvatarPrimitive.Fallback className={cn("flex size-full items-center justify-center", className)} {...props} />;
}

export { Avatar, AvatarFallback };
