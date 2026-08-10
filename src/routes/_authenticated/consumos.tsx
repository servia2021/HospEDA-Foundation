import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBasket } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/consumos")({
  head: () => ({
    meta: [
      { title: "Consumos — HOSPEDA" },
      {
        name: "description",
        content: "Consumos e serviços lançados na conta do hóspede — módulo em preparação.",
      },
      { property: "og:title", content: "Consumos — HOSPEDA" },
      { property: "og:description", content: "Bebidas, refeições e serviços por estadia." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      icon={ShoppingBasket}
      phase="Fase 3"
      title="Consumos"
      description="Lançamentos de bebidas, refeições e serviços associados a cada estadia."
      planned={[
        "Catálogo de produtos e serviços com preço em Kz",
        "Lançamento rápido na conta do quarto",
        "Controlo simples de stock básico",
        "Fecho de conta com consumos incluídos",
      ]}
    />
  ),
});
