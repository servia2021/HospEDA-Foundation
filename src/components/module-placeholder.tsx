import type { LucideIcon } from "lucide-react";
import { Clock3, Check } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";

/** Página de módulo por implementar — deixa claro o que vem em cada fase. */
export function ModulePlaceholder({
  title,
  description,
  icon: Icon,
  phase,
  planned,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  phase: string;
  planned: readonly string[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        badge={
          <Badge variant="secondary" className="gap-1.5">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            {phase}
          </Badge>
        }
      />

      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-display text-base font-bold text-foreground">
              Módulo por implementar
            </h2>
            <p className="text-sm text-muted-foreground">
              A estrutura já está preparada. Nada foi simulado aqui.
            </p>
          </div>
        </div>

        <ul className="mt-5 grid gap-2.5">
          {planned.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground">
                <Check className="h-3 w-3" aria-hidden="true" />
              </span>
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
