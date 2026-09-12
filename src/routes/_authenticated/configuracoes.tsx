import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Users, Plug, ShieldCheck, LogOut, Clock3, Loader2, Clock } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccess, SESSION_QUERY_KEY } from "@/hooks/useSessionContext";
import { ROLE_LABELS, APP_ROLES } from "@/lib/roles";
import { updateEstablishment } from "@/lib/session.functions";
import {
  DEFAULT_DAY_START,
  DEFAULT_TIMEZONE,
  SUPPORTED_TIMEZONES,
  toTimeInputValue,
} from "@/lib/operations";

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

function EstablishmentForm() {
  const queryClient = useQueryClient();
  const { session } = useAccess();
  const establishment = session?.establishment;
  const save = useServerFn(updateEstablishment);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState<string>(DEFAULT_TIMEZONE);
  const [dayStartTime, setDayStartTime] = useState<string>(DEFAULT_DAY_START);

  useEffect(() => {
    if (!establishment) return;
    setName(establishment.name ?? "");
    setPhone(establishment.phone ?? "");
    setCity(establishment.city ?? "");
    setAddress(establishment.address ?? "");
    setTimezone(establishment.timezone || DEFAULT_TIMEZONE);
    setDayStartTime(toTimeInputValue(establishment.day_start_time));
  }, [establishment]);

  const mutation = useMutation({
    mutationFn: () => save({ data: { name, phone, city, address, timezone, dayStartTime } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      toast.success("Dados do estabelecimento guardados.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível guardar.");
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="est-name">Nome do estabelecimento</Label>
        <Input id="est-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="est-phone">Telefone</Label>
          <Input
            id="est-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="est-city">Cidade</Label>
          <Input id="est-city" value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="est-address">Endereço (opcional)</Label>
        <Input id="est-address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="est-timezone">Fuso horário</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="est-timezone">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="est-day-start">Início do dia operacional</Label>
          <Input
            id="est-day-start"
            type="time"
            value={dayStartTime}
            onChange={(e) => setDayStartTime(e.target.value)}
            aria-describedby="day-start-hint"
            required
          />
          <p id="day-start-hint" className="text-xs text-muted-foreground">
            Define a partir de que hora conta um novo dia nos totais.
          </p>
        </div>
      </div>

      <Button type="submit" disabled={mutation.isPending} className="w-full sm:w-auto">
        {mutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : null}
        Guardar alterações
      </Button>
    </form>
  );
}

function SettingsPage() {
  const { session, role, can } = useAccess();
  const router = useRouter();
  const queryClient = useQueryClient();
  const establishment = session?.establishment;
  const canEdit = can("estabelecimento.editar");

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
        {canEdit ? (
          <EstablishmentForm />
        ) : (
          <>
            <Row label="Nome" value={establishment?.name ?? "—"} />
            <Row label="Telefone" value={establishment?.phone ?? "—"} />
            <Row label="Cidade" value={establishment?.city ?? "—"} />
            <Row label="Endereço" value={establishment?.address ?? "—"} />
            <Row label="Moeda" value={`${establishment?.currency ?? "AOA"} · Kz`} />
            <Row label="Fuso horário" value={establishment?.timezone ?? DEFAULT_TIMEZONE} />
            <Row
              label="Início do dia"
              value={toTimeInputValue(establishment?.day_start_time)}
            />
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Apenas o Proprietário e o Administrador podem alterar estes dados.
            </p>
          </>
        )}
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
          O convite e a gestão da equipa entram no passo seguinte. As permissões por papel já estão
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
