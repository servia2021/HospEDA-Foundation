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
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAccess } from "@/hooks/useSessionContext";
import { formatMoney, formatPercent } from "@/lib/currency";
import { ROLE_LABELS } from "@/lib/roles";
import { Skeleton } from "@/components/ui/skeleton";
import { getOperationsBoard } from "@/lib/operations.functions";
import { BOARD_QUERY_KEY } from "@/components/hospedagem/board";

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

  return <LiveDashboard name={session?.establishment?.name ?? "Dashboard"} role={role} currency={currency} />;
}

function dayKey(iso: string | number, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

function LiveDashboard({ name, role, currency }: { name: string; role: ReturnType<typeof useAccess>["role"]; currency: string }) {
  const fetchBoard = useServerFn(getOperationsBoard);
  const board = useQuery({
    queryKey: BOARD_QUERY_KEY,
    queryFn: () => fetchBoard(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  if (board.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const data = board.data;
  const rooms = data?.rooms ?? [];
  const tz = data?.timezone ?? "Africa/Luanda";
  const now = data ? new Date(data.serverNow).getTime() : Date.now();
  const total = rooms.length;
  const occupied = rooms.filter((r) => r.status === "ocupado").length;
  const free = rooms.filter((r) => r.status === "livre").length;
  const stays = rooms.flatMap((r) => (r.stay ? [{ room: r.name, ...r.stay }] : []));
  const today = dayKey(now, tz);
  const checkIns = stays.filter((s) => dayKey(s.startedAt, tz) === today).length;
  const due = stays.filter((s) => new Date(s.expectedCheckoutAt).getTime() <= now);
  const pending = stays.reduce((a, s) => a + Math.max(0, s.expectedAmount - s.paidKz), 0);
  const received = data?.receivedTodayKz ?? 0;
  const debts = stays.filter((s) => s.expectedAmount > s.paidKz);
  const noRooms = total === 0 ? "Sem quartos registados" : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={name}
        description="Estado atual da hospedaria, com os mesmos dados da Hospedagem."
        badge={role ? <Badge variant="secondary">{ROLE_LABELS[role]}</Badge> : null}
      />

      {board.isError ? (
        <p className="text-sm text-destructive">Não foi possível carregar os dados. Tente novamente.</p>
      ) : null}

      <section aria-labelledby="ocupacao-titulo" className="space-y-3">
        <h2 id="ocupacao-titulo" className="text-sm font-bold text-foreground">
          Hospedagem hoje
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Ocupação"
            value={formatPercent(total ? occupied / total : 0)}
            hint={noRooms ?? `${occupied} de ${total} quartos`}
            icon={BedDouble}
          />
          <MetricCard label="Disponíveis" value={String(free)} hint={noRooms ?? `${total} quartos registados`} icon={DoorOpen} />
          <MetricCard label="Check-ins" value={String(checkIns)} hint="Em curso, entrada hoje" icon={LogIn} />
          <MetricCard label="Check-outs" value={String(due.length)} hint="A sair ou expiradas" icon={LogOut} />
        </div>
      </section>

      <section aria-labelledby="dinheiro-titulo" className="space-y-3">
        <h2 id="dinheiro-titulo" className="text-sm font-bold text-foreground">
          Dinheiro do dia
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Receita" value={formatMoney(received, currency)} hint="Pagamentos ativos de hoje" icon={Wallet} tone="money" />
          <MetricCard label="Recebido" value={formatMoney(received, currency)} hint="Desde o início do dia" icon={BanknoteArrowUp} tone="money" />
          <MetricCard
            label="Pendente"
            value={formatMoney(pending, currency)}
            hint={pending ? "Em falta nas estadias em curso" : "Sem valores em dívida"}
            icon={Hourglass}
            tone="money"
          />
        </div>
      </section>

      <section aria-labelledby="alertas-titulo" className="space-y-3">
        <h2 id="alertas-titulo" className="text-sm font-bold text-foreground">
          Alertas
        </h2>
        {due.length || debts.length ? (
          <ul className="surface-card divide-y divide-border">
            {due.map((s) => (
              <li key={`d-${s.id}`} className="p-4 text-sm text-foreground">
                Quarto {s.room} — {s.guestName}: tempo terminado, falta registar saída
              </li>
            ))}
            {debts.map((s) => (
              <li key={`p-${s.id}`} className="p-4 text-sm text-foreground">
                Quarto {s.room} — {s.guestName}: faltam {formatMoney(s.expectedAmount - s.paidKz, currency)}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={TriangleAlert}
            title="Sem alertas"
            description="Estadias com tempo terminado ou valores em falta aparecem aqui primeiro."
          />
        )}
      </section>

      <Button asChild variant="outline" className="w-full sm:w-auto">
        <Link to="/hospedagem">Abrir Hospedagem</Link>
      </Button>
    </div>
  );
}
