import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — HOSPEDA" },
      {
        name: "description",
        content: "Resultados de ocupação e receita por período — módulo em preparação.",
      },
      { property: "og:title", content: "Relatórios — HOSPEDA" },
      { property: "og:description", content: "Leitura simples dos resultados do negócio." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      icon={BarChart3}
      phase="Fase 5"
      title="Relatórios"
      description="Leitura simples dos resultados, para decidir sem ser contabilista."
      planned={[
        "Ocupação e receita por período",
        "Recebido versus pendente em Kz",
        "Desempenho por utilizador e por turno",
        "Exportação leve para partilha",
      ]}
    />
  ),
});
