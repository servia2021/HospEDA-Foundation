import {
  LayoutDashboard,
  BedDouble,
  ShoppingBasket,
  Wallet,
  ClipboardList,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/roles";

export type NavItem = {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  permission: Permission;
  /** Módulo ainda não implementado (Fase 1). */
  upcoming: boolean;
  primary: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    shortLabel: "Início",
    icon: LayoutDashboard,
    permission: "dashboard.ver",
    upcoming: false,
    primary: true,
  },
  {
    to: "/hospedagem",
    label: "Hospedagem",
    shortLabel: "Quartos",
    icon: BedDouble,
    permission: "hospedagem.ver",
    upcoming: true,
    primary: true,
  },
  {
    to: "/consumos",
    label: "Consumos",
    shortLabel: "Consumos",
    icon: ShoppingBasket,
    permission: "consumos.ver",
    upcoming: true,
    primary: true,
  },
  {
    to: "/caixa",
    label: "Caixa",
    shortLabel: "Caixa",
    icon: Wallet,
    permission: "caixa.ver",
    upcoming: true,
    primary: true,
  },
  {
    to: "/operacao",
    label: "Operação",
    shortLabel: "Operação",
    icon: ClipboardList,
    permission: "operacao.ver",
    upcoming: true,
    primary: false,
  },
  {
    to: "/relatorios",
    label: "Relatórios",
    shortLabel: "Relatórios",
    icon: BarChart3,
    permission: "relatorios.ver",
    upcoming: true,
    primary: false,
  },
  {
    to: "/configuracoes",
    label: "Configurações",
    shortLabel: "Ajustes",
    icon: Settings,
    permission: "configuracoes.ver",
    upcoming: false,
    primary: false,
  },
] as const;
