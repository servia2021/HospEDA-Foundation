import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { OperationsBoardView } from "@/components/hospedagem/board";

export const Route = createFileRoute("/_authenticated/hospedagem")({
  head: () => ({
    meta: [
      { title: "Hospedagem — HOSPEDA" },
      {
        name: "description",
        content: "Quartos, hospedagens em curso, cronómetros e pagamentos em tempo real.",
      },
      { property: "og:title", content: "Hospedagem — HOSPEDA" },
      { property: "og:description", content: "Controlo operacional da hospedaria à distância." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HospedagemPage,
});

function HospedagemPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospedagem"
        description="Estado real dos quartos, tempo restante e dinheiro recebido — atualizado ao vivo."
      />
      <OperationsBoardView />
    </div>
  );
}
