/**
 * Definições operacionais do estabelecimento.
 * Base para os cálculos de "hoje" (check-ins, caixa do dia) das fases seguintes.
 */

export const DEFAULT_TIMEZONE = "Africa/Luanda" as const;
export const DEFAULT_DAY_START = "00:00" as const;

export const SUPPORTED_TIMEZONES = [
  { value: "Africa/Luanda", label: "Angola (Africa/Luanda)" },
  { value: "Africa/Maputo", label: "Moçambique (Africa/Maputo)" },
  { value: "Europe/Lisbon", label: "Portugal (Europe/Lisbon)" },
  { value: "UTC", label: "UTC" },
] as const;

/** Normaliza "00:00:00" (Postgres time) para "00:00". */
export function toTimeInputValue(value: string | null | undefined): string {
  if (!value) return DEFAULT_DAY_START;
  const [hours = "00", minutes = "00"] = value.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}
