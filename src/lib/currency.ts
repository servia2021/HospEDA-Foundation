/** Moeda padrão do HOSPEDA (Angola). */
export const DEFAULT_CURRENCY = "AOA" as const;

export const SUPPORTED_CURRENCIES = [{ code: "AOA", label: "Kwanza angolano (Kz)" }] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

/** Formata um valor monetário em Kz (pt-PT). */
export function formatMoney(value: number, currency: string = DEFAULT_CURRENCY): string {
  const formatted = new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

  return currency === "AOA" ? `${formatted} Kz` : `${formatted} ${currency}`;
}

/** Formata percentagens de ocupação. */
export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(value)}%`;
}
