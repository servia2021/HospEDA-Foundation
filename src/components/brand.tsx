import { cn } from "@/lib/utils";

export function Brand({
  className,
  tone = "light",
  showTagline = false,
}: {
  className?: string;
  tone?: "light" | "dark";
  showTagline?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display text-sm font-extrabold",
          tone === "light"
            ? "bg-primary text-primary-foreground"
            : "bg-sidebar-primary text-sidebar-primary-foreground",
        )}
        aria-hidden="true"
      >
        H
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate font-display text-base font-extrabold tracking-tight",
            tone === "light" ? "text-foreground" : "text-sidebar-foreground",
          )}
        >
          HOSPEDA
        </span>
        {showTagline ? (
          <span
            className={cn(
              "block truncate text-[11px] font-medium",
              tone === "light" ? "text-muted-foreground" : "text-sidebar-foreground/60",
            )}
          >
            Gestão de hospedagens
          </span>
        ) : null}
      </span>
    </div>
  );
}
