import { createFileRoute, Link } from "@tanstack/react-router";
import { BedDouble, Wallet, ShieldCheck, Smartphone, ArrowRight } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HOSPEDA — Gestão simples de hospedagens em Angola" },
      {
        name: "description",
        content:
          "HOSPEDA dá ao proprietário visibilidade e controlo da operação e do dinheiro da sua hospedaria, pousada ou pequeno hotel em Angola.",
      },
      { property: "og:title", content: "HOSPEDA — Gestão simples de hospedagens" },
      {
        property: "og:description",
        content:
          "Controlo de quartos, consumos e caixa em Kz, feito para telemóvel e para a realidade angolana.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const PILLARS = [
  {
    icon: BedDouble,
    title: "Hospedagem sob controlo",
    text: "Saiba o que está ocupado, livre e a sair, sem estar no local.",
  },
  {
    icon: Wallet,
    title: "Dinheiro claro em Kz",
    text: "Receita, recebido e pendente sempre visíveis e sem confusão.",
  },
  {
    icon: Smartphone,
    title: "Feito para telemóvel",
    text: "Leve, rápido e utilizável mesmo com ligação fraca.",
  },
  {
    icon: ShieldCheck,
    title: "Equipa com papéis",
    text: "Proprietário, Administrador e Recepcionista com acessos próprios.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Brand />
        <Button asChild size="sm">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <section className="surface-card mt-4 px-5 py-10 sm:px-10 sm:py-14">
          <p className="text-xs font-bold tracking-widest text-primary uppercase">
            Fase 1 · Fundação
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl leading-tight font-extrabold text-foreground sm:text-4xl">
            Simples por fora. Inteligente por dentro.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            O HOSPEDA foi pensado para hospedarias, pousadas, motéis e pequenos hotéis em Angola.
            Visibilidade da operação e do dinheiro, mesmo à distância.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Começar agora
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {PILLARS.map((pillar) => (
            <article key={pillar.title} className="surface-card p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <pillar.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-3.5 font-display text-base font-bold text-foreground">
                {pillar.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{pillar.text}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
