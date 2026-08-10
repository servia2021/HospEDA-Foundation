import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BedDouble,
  DoorOpen,
  LogIn,
  LogOut,
  Wallet,
  BanknoteArrowUp,
  Hourglass,
  TriangleAlert,
  Building2,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAccess } from "@/hooks/useSessionContext";
import { formatMoney, formatPercent } from "@/lib/currency";
import { ROLE_LABELS } from "@/lib/roles";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — HOSPEDA" },
      {
        name: "description",
        content: "Visão diária da ocupação, check-ins, check-outs e dinheiro da sua hospedaria.",
      },
      { property: "og:title", content: "Dashboard — HOSPEDA" },
      {
        property: "og:description",
        content: "Ocupação, disponibilidade e caixa do dia num só ecrã.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { session, role, isLoading } = useAccess();
  const currency = session?.establishment?.currency ?? "AOA";
  const hasEstablishment = Boolean(session?.establishment);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasEstablishment) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Bem-vindo ao HOSPEDA"
          description="Falta apenas registar o seu estabelecimento para começar."
        />
        <EmptyState
          icon={Building2}
          title="Nenhum estabelecimento configurado"
          description="Registe o nome, contacto, cidade e moeda da sua hospedaria. Os dados ficam isolados dos restantes estabelecimentos."
          action={
            <Button asChild size="lg">
              <Link to="/onboarding">Configurar estabelecimento</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={session?.establishment?.name ?? "Dashboard"}
        description="Ainda não existem dados de operação. Os indicadores enchem-se automaticamente quando a hospedagem e o caixa entrarem em funcionamento."
        badge={role ? <Badge variant="secondary">{ROLE_LABELS[role]}</Badge> : null}
      />

      <section aria-labelledby="ocupacao-titulo" className="space-y-3">
        <h2 id="ocupacao-titulo" className="text-sm font-bold text-foreground">
          Hospedagem hoje
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Ocupação"
            value={formatPercent(0)}
            hint="Sem quartos registados"
            icon={BedDouble}
          />
          <MetricCard
            label="Disponíveis"
            value="0"
            hint="Sem quartos registados"
            icon={DoorOpen}
          />
          <MetricCard label="Check-ins" value="0" hint="Nenhum previsto" icon={LogIn} />
          <MetricCard label="Check-outs" value="0" hint="Nenhum previsto" icon={LogOut} />
        </div>
      </section>

      <section aria-labelledby="dinheiro-titulo" className="space-y-3">
        <h2 id="dinheiro-titulo" className="text-sm font-bold text-foreground">
          Dinheiro do dia
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Receita"
            value={formatMoney(0, currency)}
            hint="Sem movimentos"
            icon={Wallet}
            tone="money"
          />
          <MetricCard
            label="Recebido"
            value={formatMoney(0, currency)}
            hint="Sem movimentos"
            icon={BanknoteArrowUp}
            tone="money"
          />
          <MetricCard
            label="Pendente"
            value={formatMoney(0, currency)}
            hint="Sem valores em dívida"
            icon={Hourglass}
            tone="money"
          />
        </div>
      </section>

      <section aria-labelledby="alertas-titulo" className="space-y-3">
        <h2 id="alertas-titulo" className="text-sm font-bold text-foreground">
          Alertas
        </h2>
        <EmptyState
          icon={TriangleAlert}
          title="Sem alertas"
          description="Quando existirem estadias em atraso, valores pendentes ou tarefas de operação em risco, aparecem aqui primeiro."
        />
      </section>

      <section className="surface-card flex items-start gap-3 p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold text-foreground">Próximos passos</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Fase 1 concluída: acesso, estabelecimento, equipa e navegação. As fases seguintes
            acrescentam hospedagem, consumos, caixa, operação e relatórios.
          </p>
        </div>
      </section>
    </div>
  );
}
