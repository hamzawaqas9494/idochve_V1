import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-[var(--border)] motion-reduce:animate-none", className)} />;
}

export { Skeleton };
