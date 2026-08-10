import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
}: {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("grid gap-3 sm:flex sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="truncate font-display text-xl font-extrabold text-foreground sm:text-2xl">
            {title}
          </h1>
          {badge}
        </div>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
