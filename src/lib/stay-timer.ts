import { useEffect, useState } from "react";

export type TimerLevel = "normal" | "atencao" | "urgente" | "expirado";

export const TIMER_LABELS: Record<TimerLevel, string> = {
  normal: "Normal",
  atencao: "Atenção",
  urgente: "Urgente",
  expirado: "Tempo expirado",
};

/** Nível do cronómetro a partir do tempo restante (ms). */
export function timerLevel(remainingMs: number): TimerLevel {
  if (remainingMs <= 0) return "expirado";
  if (remainingMs <= 15 * 60_000) return "urgente";
  if (remainingMs <= 30 * 60_000) return "atencao";
  return "normal";
}

/** "1h 05m 09s" / "12m 03s". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(Math.abs(ms) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}h ${pad(m)}m ${pad(s)}s` : `${m}m ${pad(s)}s`;
}

export function formatClock(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("pt-PT", { hour: "2-digit", minute: "2-digit", timeZone }).format(
    new Date(iso),
  );
}

/**
 * Relógio corrigido pela hora do servidor: o cronómetro deriva sempre dos
 * horários guardados, e não depende do relógio local do aparelho.
 */
export function useServerNow(serverNowIso: string | undefined, fetchedAt: number): number {
  const offset = serverNowIso ? new Date(serverNowIso).getTime() - fetchedAt : 0;
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    setNow(Date.now() + offset);
    const id = window.setInterval(() => setNow(Date.now() + offset), 1000);
    return () => window.clearInterval(id);
  }, [offset]);
  return now;
}
