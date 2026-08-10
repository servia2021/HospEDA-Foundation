import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/operacao")({
  head: () => ({
    meta: [
      { title: "Operação — HOSPEDA" },
      {
        name: "description",
        content: "Limpeza, manutenção e tarefas do dia a dia — módulo em preparação.",
      },
      { property: "og:title", content: "Operação — HOSPEDA" },
      { property: "og:description", content: "Tarefas de limpeza, manutenção e turnos." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      icon={ClipboardList}
      phase="Fase 4"
      title="Operação"
      description="Tarefas do dia a dia da equipa, com responsabilidade clara."
      planned={[
        "Limpeza e preparação de quartos",
        "Pedidos de manutenção",
        "Tarefas atribuídas por papel",
        "Histórico auditável de cada ação",
      ]}
    />
  ),
});
