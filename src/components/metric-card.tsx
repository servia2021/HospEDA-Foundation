import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MetricTone = "neutral" | "money" | "alert";

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: MetricTone;
  className?: string;
}) {
  return (
    <article className={cn("surface-card p-4 sm:p-5", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <p className="min-w-0 truncate text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
            tone === "money" && "bg-accent-soft text-accent",
            tone === "alert" && "bg-secondary text-secondary-foreground",
            tone === "neutral" && "bg-primary-soft text-primary",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="text-numeric mt-3 font-display text-2xl font-extrabold text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </article>
  );
}
