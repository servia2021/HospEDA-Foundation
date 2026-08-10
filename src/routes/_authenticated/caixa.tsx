import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/caixa")({
  head: () => ({
    meta: [
      { title: "Caixa — HOSPEDA" },
      {
        name: "description",
        content: "Entradas, saídas e fecho de caixa em Kz — módulo em preparação.",
      },
      { property: "og:title", content: "Caixa — HOSPEDA" },
      { property: "og:description", content: "Controlo do dinheiro do turno e do dia." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      icon={Wallet}
      phase="Fase 3"
      title="Caixa"
      description="Onde o dinheiro fica claro: entradas, saídas e fecho por turno."
      planned={[
        "Recebimentos por estadia e por consumo",
        "Registo de despesas do dia",
        "Abertura e fecho de turno por utilizador",
        "Valores pendentes sempre visíveis",
      ]}
    />
  ),
});
