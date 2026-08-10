/**
 * Papéis e permissões do HOSPEDA.
 * Fase 1: a matriz existe e é usada para navegação/visibilidade.
 * Fases futuras acrescentam apenas novas chaves de permissão.
 */

export const APP_ROLES = ["proprietario", "administrador", "recepcionista"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  proprietario: "Proprietário",
  administrador: "Administrador",
  recepcionista: "Recepcionista",
};

export const PERMISSIONS = [
  "dashboard.ver",
  "hospedagem.ver",
  "consumos.ver",
  "caixa.ver",
  "operacao.ver",
  "relatorios.ver",
  "configuracoes.ver",
  "estabelecimento.editar",
  "equipa.gerir",
  "auditoria.ver",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const RECEPCIONISTA: Permission[] = [
  "dashboard.ver",
  "hospedagem.ver",
  "consumos.ver",
  "caixa.ver",
  "operacao.ver",
];

const ADMINISTRADOR: Permission[] = [
  ...RECEPCIONISTA,
  "relatorios.ver",
  "configuracoes.ver",
  "estabelecimento.editar",
  "equipa.gerir",
  "auditoria.ver",
];

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  proprietario: [...ADMINISTRADOR],
  administrador: ADMINISTRADOR,
  recepcionista: RECEPCIONISTA,
};

/** Papel de maior autoridade entre os atribuídos. */
export function highestRole(roles: readonly AppRole[]): AppRole | null {
  for (const role of APP_ROLES) {
    if (roles.includes(role)) return role;
  }
  return null;
}

export function can(roles: readonly AppRole[], permission: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}
