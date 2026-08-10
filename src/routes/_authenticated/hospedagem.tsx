import { createFileRoute } from "@tanstack/react-router";
import { BedDouble } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/hospedagem")({
  head: () => ({
    meta: [
      { title: "Hospedagem — HOSPEDA" },
      {
        name: "description",
        content: "Quartos, reservas e estadias da sua hospedaria — módulo em preparação.",
      },
      { property: "og:title", content: "Hospedagem — HOSPEDA" },
      { property: "og:description", content: "Gestão de quartos, reservas e estadias." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      icon={BedDouble}
      phase="Fase 2"
      title="Hospedagem"
      description="Aqui vai viver o coração da operação: quartos, reservas e estadias."
      planned={[
        "Registo de quartos e tipologias com preço em Kz",
        "Reservas e mapa de disponibilidade",
        "Check-in e check-out com registo do hóspede",
        "Estado do quarto em tempo real",
      ]}
    />
  ),
});
