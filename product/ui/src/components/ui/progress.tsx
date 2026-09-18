import { cn } from "@/lib/utils";

function Progress({
  value = 0,
  className,
  label,
}: {
  value?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-[var(--paper-50)]", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={label}
    >
      <div
        className="h-full bg-[var(--blue-600)] transition-[width] duration-[400ms] motion-reduce:transition-none"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export { Progress };
