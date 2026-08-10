import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEstablishment } from "@/lib/session.functions";
import { useSessionContext, SESSION_QUERY_KEY } from "@/hooks/useSessionContext";
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Configurar estabelecimento — HOSPEDA" },
      {
        name: "description",
        content: "Registe o nome, contacto, cidade e moeda da sua hospedaria no HOSPEDA.",
      },
      { property: "og:title", content: "Configurar estabelecimento — HOSPEDA" },
      {
        property: "og:description",
        content: "Primeiro passo para gerir a sua hospedaria com o HOSPEDA.",
      },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useSessionContext();
  const submit = useServerFn(createEstablishment);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [ownerName, setOwnerName] = useState("");

  useEffect(() => {
    if (session?.establishment) {
      void navigate({ to: "/dashboard", replace: true });
    }
    if (session?.fullName && !ownerName) setOwnerName(session.fullName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.establishment, session?.fullName]);

  const mutation = useMutation({
    mutationFn: () =>
      submit({
        data: {
          name,
          phone,
          city,
          address,
          currency: DEFAULT_CURRENCY,
          ownerName,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      toast.success("Estabelecimento criado.");
      await navigate({ to: "/dashboard", replace: true });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível gravar.");
    },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Configurar o estabelecimento"
        description="Estes dados identificam a sua hospedaria e isolam-na de todos os outros estabelecimentos."
      />

      <form
        className="surface-card space-y-4 p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="flex items-center gap-3 pb-1">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="min-w-0 text-sm text-muted-foreground">
            Fica registado como <strong className="text-foreground">Proprietário</strong>.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">Nome do estabelecimento</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Pousada Kalunga"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ex.: +244 923 000 000"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex.: Luanda"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="currency">Moeda padrão</Label>
            <Input
              id="currency"
              value={SUPPORTED_CURRENCIES[0].label}
              readOnly
              aria-describedby="currency-hint"
            />
            <p id="currency-hint" className="text-xs text-muted-foreground">
              Todos os valores são apresentados em Kz.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address">Endereço (opcional)</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rua, bairro, referência"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ownerName">O seu nome</Label>
          <Input
            id="ownerName"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Ex.: Ana Cardoso"
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          Guardar e continuar
        </Button>
      </form>
    </div>
  );
}
