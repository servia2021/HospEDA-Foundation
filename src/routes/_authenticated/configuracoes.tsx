import { createFileRoute } from "@tanstack/react-router";
import { Building2, Users, Plug, ShieldCheck, LogOut, Clock3 } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAccess } from "@/hooks/useSessionContext";
import { ROLE_LABELS, APP_ROLES } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — HOSPEDA" },
      {
        name: "description",
        content: "Dados do estabelecimento, papéis da equipa e integrações futuras do HOSPEDA.",
      },
      { property: "og:title", content: "Configurações — HOSPEDA" },
      { property: "og:description", content: "Estabelecimento, equipa e acessos." },
    ],
  }),
  component: SettingsPage,
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5">
      <span className="min-w-0 truncate text-sm text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function SettingsPage() {
  const { session, role, can } = useAccess();
  const router = useRouter();
  const queryClient = useQueryClient();
  const establishment = session?.establishment;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Dados do estabelecimento e acessos da equipa."
        badge={role ? <Badge variant="secondary">{ROLE_LABELS[role]}</Badge> : null}
      />

      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="min-w-0 truncate font-display text-base font-bold text-foreground">
            Estabelecimento
          </h2>
        </div>
        <Separator className="my-4" />
        <Row label="Nome" value={establishment?.name ?? "—"} />
        <Row label="Telefone" value={establishment?.phone ?? "—"} />
        <Row label="Cidade" value={establishment?.city ?? "—"} />
        <Row label="Endereço" value={establishment?.address ?? "—"} />
        <Row label="Moeda" value={`${establishment?.currency ?? "AOA"} · Kz`} />
        {can("estabelecimento.editar") ? (
          <p className="mt-3 text-xs text-muted-foreground">
            A edição destes dados fica disponível na fase seguinte.
          </p>
        ) : null}
      </section>

      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="min-w-0 truncate font-display text-base font-bold text-foreground">
            Papéis disponíveis
          </h2>
        </div>
        <Separator className="my-4" />
        <ul className="grid gap-2.5">
          {APP_ROLES.map((appRole) => (
            <li
              key={appRole}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-surface px-3.5 py-3"
            >
              <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                {ROLE_LABELS[appRole]}
              </span>
              {role === appRole ? <Badge>O seu papel</Badge> : null}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          O convite e a gestão da equipa entram numa fase seguinte. As permissões por papel já estão
          ativas na navegação.
        </p>
      </section>

      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
            <Plug className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-display text-base font-bold text-foreground">
              Integrações
            </h2>
            <p className="text-sm text-muted-foreground">Área reservada para fases futuras.</p>
          </div>
          <Badge variant="outline" className="ml-auto gap-1.5">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            Depois
          </Badge>
        </div>
      </section>

      <section className="surface-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-display text-base font-bold text-foreground">
              Conta e segurança
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">{session?.email ?? "—"}</p>
          </div>
        </div>
        <Button variant="outline" className="mt-4 w-full sm:w-auto" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Terminar sessão
        </Button>
      </section>
    </div>
  );
}
