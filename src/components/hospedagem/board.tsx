import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BedDouble, Clock, Loader2, Plus, TriangleAlert, Wrench, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetricCard } from "@/components/metric-card";
import { EmptyState } from "@/components/empty-state";
import { useAccess } from "@/hooks/useSessionContext";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  addPayment,
  createGuest,
  extendStay,
  finishStay,
  getOperationsBoard,
  markRoomReady,
  setRoomMaintenance,
  startHourlyStay,
  startNightStay,
  upsertRoom,
  upsertRoomType,
  type BoardRoom,
  type OperationsBoard,
} from "@/lib/operations.functions";
import { formatClock, formatDuration, timerLevel, TIMER_LABELS, useServerNow, type TimerLevel } from "@/lib/stay-timer";

export const BOARD_QUERY_KEY = ["operations-board"] as const;
type Method = "dinheiro" | "tpa_transferencia" | "outro";
const METHOD_LABELS: Record<Method, string> = {
  dinheiro: "Dinheiro",
  tpa_transferencia: "TPA / Transferência",
  outro: "Outro",
};
const STATUS_LABELS: Record<BoardRoom["status"], string> = {
  livre: "Livre",
  ocupado: "Ocupado",
  limpeza: "Limpeza",
  manutencao: "Manutenção",
};
const LEVEL_CLASS: Record<TimerLevel, string> = {
  normal: "bg-primary-soft text-primary",
  atencao: "bg-accent-soft text-accent",
  urgente: "bg-destructive/10 text-destructive",
  expirado: "bg-destructive text-destructive-foreground",
};

const err = (e: unknown) => (e instanceof Error ? e.message : "Ocorreu um erro. Tente novamente.");

type Action =
  | { kind: "checkin"; room: BoardRoom }
  | { kind: "extend"; room: BoardRoom; minutes: number }
  | { kind: "pay"; room: BoardRoom }
  | { kind: "checkout"; room: BoardRoom }
  | null;

export function OperationsBoardView() {
  const { session, role } = useAccess();
  const isManager = role === "proprietario" || role === "administrador";
  const establishmentId = session?.establishment?.id;
  const queryClient = useQueryClient();
  const fetchBoard = useServerFn(getOperationsBoard);
  const [fetchedAt, setFetchedAt] = useState(() => Date.now());

  const board = useQuery({
    queryKey: BOARD_QUERY_KEY,
    queryFn: async () => {
      const result = await fetchBoard();
      setFetchedAt(Date.now());
      return result;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const now = useServerNow(board.data?.serverNow, fetchedAt);
  const [action, setAction] = useState<Action>(null);

  // Atualização em tempo real (as regras de acesso da base de dados aplicam-se).
  useEffect(() => {
    if (!establishmentId) return;
    const filter = `establishment_id=eq.${establishmentId}`;
    const refresh = () => queryClient.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
    const channel = supabase
      .channel(`ops-${establishmentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "stays", filter }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments", filter }, refresh)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [establishmentId, queryClient]);

  const data = board.data;
  const summary = useMemo(() => {
    const rooms = data?.rooms ?? [];
    let pending = 0;
    let expiring = 0;
    for (const r of rooms) {
      if (!r.stay) continue;
      pending += Math.max(0, r.stay.expectedAmount - r.stay.paidKz);
      if (new Date(r.stay.expectedCheckoutAt).getTime() - now <= 30 * 60_000) expiring += 1;
    }
    return {
      occupied: rooms.filter((r) => r.status === "ocupado").length,
      free: rooms.filter((r) => r.status === "livre").length,
      expiring,
      pending,
    };
  }, [data, now]);

  if (board.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }
  if (board.isError || !data) {
    return (
      <div className="space-y-2 text-sm text-destructive">
        <p>{err(board.error)}</p>
        <Button variant="outline" onClick={() => board.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const occupied = data.rooms
    .filter((r) => r.stay)
    .sort((a, b) => new Date(a.stay!.expectedCheckoutAt).getTime() - new Date(b.stay!.expectedCheckoutAt).getTime());
  const others = data.rooms.filter((r) => !r.stay);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Ocupados" value={String(summary.occupied)} icon={BedDouble} />
        <MetricCard label="Livres" value={String(summary.free)} icon={BedDouble} />
        <MetricCard label="A sair / expirados" value={String(summary.expiring)} icon={Clock} tone="alert" />
        <MetricCard label="Recebido hoje" value={formatMoney(data.receivedTodayKz)} icon={Sparkles} tone="money" />
        <MetricCard label="Em falta" value={formatMoney(summary.pending)} icon={TriangleAlert} tone="money" />
      </div>

      {data.rooms.length === 0 ? (
        <EmptyState
          icon={BedDouble}
          title="Ainda não há quartos"
          description={
            isManager
              ? "Crie o primeiro tipo de quarto e os quartos abaixo."
              : "Peça ao Proprietário ou Administrador para registar os quartos."
          }
        />
      ) : null}

      {occupied.length > 0 ? (
        <section className="space-y-3" aria-labelledby="ocupados-titulo">
          <h2 id="ocupados-titulo" className="text-sm font-bold text-foreground">
            Hospedagens em curso
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {occupied.map((room) => (
              <StayCard key={room.id} room={room} now={now} timeZone={data.timezone} onAction={setAction} />
            ))}
          </ul>
        </section>
      ) : null}

      {others.length > 0 ? (
        <section className="space-y-3" aria-labelledby="quartos-titulo">
          <h2 id="quartos-titulo" className="text-sm font-bold text-foreground">
            Outros quartos
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {others.map((room) => (
              <RoomTile key={room.id} room={room} isManager={isManager} onAction={setAction} />
            ))}
          </ul>
        </section>
      ) : null}

      {isManager ? <RoomAdmin board={data} /> : null}

      <ActionDialog action={action} onClose={() => setAction(null)} isManager={isManager} timeZone={data.timezone} />
    </div>
  );
}

function StayCard({
  room,
  now,
  timeZone,
  onAction,
}: {
  room: BoardRoom;
  now: number;
  timeZone: string;
  onAction: (a: Action) => void;
}) {
  const stay = room.stay!;
  const remaining = new Date(stay.expectedCheckoutAt).getTime() - now;
  const level = timerLevel(remaining);
  const owed = Math.max(0, stay.expectedAmount - stay.paidKz);
  const hourly = stay.mode === "horas";

  return (
    <li className="surface-card space-y-3 p-4" data-testid={`stay-${room.name}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-extrabold text-foreground">Quarto {room.name}</p>
          <p className="truncate text-sm text-muted-foreground">{stay.guestName}</p>
        </div>
        <Badge variant="secondary">{hourly ? "Por horas" : "Por noite"} · Ocupado</Badge>
      </div>

      <div className={cn("rounded-xl px-3.5 py-3", LEVEL_CLASS[level])} data-testid="timer">
        <p className="text-xs font-bold tracking-wide uppercase">{TIMER_LABELS[level]}</p>
        <p className="text-numeric font-display text-2xl font-extrabold">
          {level === "expirado" ? `+${formatDuration(remaining)}` : formatDuration(remaining)}
        </p>
        <p className="text-xs">
          {level === "expirado" ? "Excedido · expirou às " : "Termina às "}
          {formatClock(stay.expectedCheckoutAt, timeZone)} · entrada {formatClock(stay.startedAt, timeZone)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <p className="text-muted-foreground">
          Recebido <span className="block font-semibold text-foreground">{formatMoney(stay.paidKz)}</span>
        </p>
        <p className="text-muted-foreground">
          Em falta{" "}
          <span className={cn("block font-semibold", owed > 0 ? "text-destructive" : "text-foreground")}>
            {formatMoney(owed)}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {hourly ? (
          <>
            <Button size="lg" variant="outline" onClick={() => onAction({ kind: "extend", room, minutes: 30 })}>
              +30 min
            </Button>
            <Button size="lg" variant="outline" onClick={() => onAction({ kind: "extend", room, minutes: 60 })}>
              +1 hora
            </Button>
            <Button size="lg" variant="outline" onClick={() => onAction({ kind: "extend", room, minutes: 120 })}>
              +2 horas
            </Button>
          </>
        ) : null}
        {owed > 0 ? (
          <Button size="lg" variant="outline" onClick={() => onAction({ kind: "pay", room })}>
            Receber
          </Button>
        ) : null}
        <Button size="lg" className="col-span-2" onClick={() => onAction({ kind: "checkout", room })}>
          Registar saída
        </Button>
      </div>
    </li>
  );
}

function RoomTile({
  room,
  isManager,
  onAction,
}: {
  room: BoardRoom;
  isManager: boolean;
  onAction: (a: Action) => void;
}) {
  const qc = useQueryClient();
  const ready = useServerFn(markRoomReady);
  const maintenance = useServerFn(setRoomMaintenance);
  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: BOARD_QUERY_KEY }),
    onError: (e) => toast.error(err(e)),
  });

  return (
    <li className="surface-card flex flex-col gap-2 p-3.5" data-testid={`room-${room.name}`}>
      <p className="font-display text-base font-extrabold text-foreground">Quarto {room.name}</p>
      <Badge variant={room.status === "livre" ? "default" : "secondary"} className="self-start">
        {STATUS_LABELS[room.status]}
      </Badge>
      {room.status === "livre" ? (
        <Button onClick={() => onAction({ kind: "checkin", room })}>Registar entrada</Button>
      ) : null}
      {room.status === "limpeza" ? (
        <Button disabled={run.isPending} onClick={() => run.mutate(() => ready({ data: { roomId: room.id } }))}>
          Pronto
        </Button>
      ) : null}
      {isManager && (room.status === "livre" || room.status === "manutencao") ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={run.isPending}
          onClick={() =>
            run.mutate(() => maintenance({ data: { roomId: room.id, on: room.status === "livre" } }))
          }
        >
          <Wrench className="h-4 w-4" aria-hidden="true" />
          {room.status === "livre" ? "Manutenção" : "Tirar de manutenção"}
        </Button>
      ) : null}
    </li>
  );
}

function ActionDialog({
  action,
  onClose,
  isManager,
  timeZone,
}: {
  action: Action;
  onClose: () => void;
  isManager: boolean;
  timeZone: string;
}) {
  const qc = useQueryClient();
  const fnGuest = useServerFn(createGuest);
  const fnNight = useServerFn(startNightStay);
  const fnHourly = useServerFn(startHourlyStay);
  const fnExtend = useServerFn(extendStay);
  const fnPay = useServerFn(addPayment);
  const fnFinish = useServerFn(finishStay);

  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState<"horas" | "noite">("horas");
  const [units, setUnits] = useState(1);
  const [price, setPrice] = useState(0);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<Method>("dinheiro");
  const [minutes, setMinutes] = useState(60);

  const room = action?.room;
  const stay = room?.stay ?? null;
  const owed = stay ? Math.max(0, stay.expectedAmount - stay.paidKz) : 0;
  const extendPrice = stay
    ? Math.ceil((stay.agreedAmount * minutes) / Math.max(room!.hourlyBlockMinutes, 1))
    : 0;

  useEffect(() => {
    if (!action) return;
    setGuestName("");
    setPhone("");
    setMethod("dinheiro");
    setUnits(1);
    const m = action.room.hourlyPriceKz ? "horas" : "noite";
    setMode(m);
    const p = m === "horas" ? action.room.hourlyPriceKz ?? 0 : action.room.nightlyPriceKz;
    setPrice(p);
    setAmount(p);
    if (action.kind === "extend") setMinutes(action.minutes);
    if (action.kind === "pay") setAmount(owed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  useEffect(() => {
    if (action?.kind !== "checkin") return;
    const p = mode === "horas" ? action.room.hourlyPriceKz ?? 0 : action.room.nightlyPriceKz;
    setPrice(p);
  }, [mode, action]);

  useEffect(() => {
    if (action?.kind === "checkin") setAmount(price * units);
  }, [price, units, action]);

  const mutation = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!action) return "";
      if (action.kind === "checkin") {
        const guestId = await fnGuest({ data: { fullName: guestName, phone: phone || null } });
        const base = { roomId: action.room.id, guestId, units, agreedAmount: price };
        if (mode === "horas") await fnHourly({ data: { ...base, payment: { amount: price * units, method } } });
        else await fnNight({ data: { ...base, payment: amount > 0 ? { amount, method } : null } });
        return `Entrada registada no quarto ${action.room.name}.`;
      }
      if (action.kind === "extend") {
        const r = await fnExtend({
          data: {
            stayId: stay!.id,
            minutes,
            expectedCheckoutAt: stay!.expectedCheckoutAt,
            amount: extendPrice,
            payNow: true,
            method,
          },
        });
        return `Quarto ${action.room.name} estendido até ${formatClock(r.expectedCheckoutAt, timeZone)}.`;
      }
      if (action.kind === "pay") {
        await fnPay({ data: { stayId: stay!.id, amount, method } });
        return `Pagamento de ${formatMoney(amount)} registado.`;
      }
      await fnFinish({ data: { stayId: stay!.id, allowDebt: owed > 0 && isManager } });
      return `Saída registada. Quarto ${action.room.name} vai para limpeza.`;
    },
    onSuccess: async (msg) => {
      await qc.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
      toast.success(msg);
      onClose();
    },
    onError: async (e) => {
      toast.error(err(e));
      await qc.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
    },
  });

  const title =
    action?.kind === "checkin"
      ? `Entrada · Quarto ${room?.name}`
      : action?.kind === "extend"
        ? `Estender · Quarto ${room?.name}`
        : action?.kind === "pay"
          ? `Receber · Quarto ${room?.name}`
          : `Saída · Quarto ${room?.name}`;

  const methodSelect = (
    <div className="space-y-1.5">
      <Label htmlFor="op-method">Meio de pagamento</Label>
      <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
        <SelectTrigger id="op-method">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(METHOD_LABELS) as Method[]).map((m) => (
            <SelectItem key={m} value={m}>
              {METHOD_LABELS[m]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open={action !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {action?.kind === "checkout" && owed > 0 ? (
            <DialogDescription>
              {isManager
                ? `Existe ${formatMoney(owed)} em falta. Ao confirmar, a saída fica registada com dívida.`
                : `Existe ${formatMoney(owed)} em falta. Receba o valor antes de registar a saída.`}
            </DialogDescription>
          ) : null}
          {action?.kind === "checkout" && owed === 0 ? (
            <DialogDescription>Tudo pago. O quarto passa para limpeza.</DialogDescription>
          ) : null}
          {action?.kind === "extend" && stay ? (
            <DialogDescription>
              Termina às {formatClock(stay.expectedCheckoutAt, timeZone)}. Pagamento antecipado de{" "}
              {formatMoney(extendPrice)}.
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <form
          id="op-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          {action?.kind === "checkin" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="op-guest">Nome do hóspede</Label>
                <Input id="op-guest" value={guestName} onChange={(e) => setGuestName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="op-phone">Telefone (opcional)</Label>
                <Input id="op-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="op-mode">Modo</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as "horas" | "noite")}>
                    <SelectTrigger id="op-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {room?.hourlyPriceKz ? <SelectItem value="horas">Por horas</SelectItem> : null}
                      <SelectItem value="noite">Por noite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="op-units">
                    {mode === "horas" ? `Períodos de ${(room?.hourlyBlockMinutes ?? 0) / 60}h` : "Noites"}
                  </Label>
                  <Input
                    id="op-units"
                    type="number"
                    min={1}
                    max={mode === "horas" ? 12 : 60}
                    value={units}
                    onChange={(e) => setUnits(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="op-price">Preço por {mode === "horas" ? "período" : "noite"} (Kz)</Label>
                <Input
                  id="op-price"
                  type="number"
                  min={1}
                  value={price}
                  disabled={!isManager}
                  onChange={(e) => setPrice(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                />
              </div>
              {mode === "horas" ? (
                <p className="rounded-xl bg-accent-soft px-3.5 py-3 text-sm font-semibold text-accent">
                  Pagamento total na entrada: {formatMoney(price * units)}
                </p>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="op-amount">Pago agora (Kz) · total {formatMoney(price * units)}</Label>
                  <Input
                    id="op-amount"
                    type="number"
                    min={0}
                    max={price * units}
                    value={amount}
                    onChange={(e) => setAmount(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                  />
                </div>
              )}
              {methodSelect}
            </>
          ) : null}

          {action?.kind === "extend" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="op-minutes">Minutos a acrescentar</Label>
                <Input
                  id="op-minutes"
                  type="number"
                  min={15}
                  step={15}
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(15, Math.round(Number(e.target.value) || 15)))}
                />
              </div>
              {methodSelect}
            </>
          ) : null}

          {action?.kind === "pay" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="op-pay">Valor (Kz) · em falta {formatMoney(owed)}</Label>
                <Input
                  id="op-pay"
                  type="number"
                  min={1}
                  max={owed}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                />
              </div>
              {methodSelect}
            </>
          ) : null}
        </form>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="lg" onClick={onClose} disabled={mutation.isPending}>
            Voltar
          </Button>
          <Button
            type="submit"
            form="op-form"
            size="lg"
            disabled={mutation.isPending || (action?.kind === "checkout" && owed > 0 && !isManager)}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {action?.kind === "checkin"
              ? "Confirmar entrada"
              : action?.kind === "extend"
                ? "Confirmar extensão"
                : action?.kind === "pay"
                  ? "Confirmar pagamento"
                  : "Confirmar saída"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Gestão mínima de tipos de quarto e quartos (só gestores; validado no servidor). */
function RoomAdmin({ board }: { board: OperationsBoard }) {
  const qc = useQueryClient();
  const fnType = useServerFn(upsertRoomType);
  const fnRoom = useServerFn(upsertRoom);
  const [typeName, setTypeName] = useState("");
  const [nightly, setNightly] = useState(0);
  const [hourly, setHourly] = useState(0);
  const [block, setBlock] = useState(120);
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState("");

  const done = async (msg: string) => {
    await qc.invalidateQueries({ queryKey: BOARD_QUERY_KEY });
    toast.success(msg);
  };
  const typeM = useMutation({
    mutationFn: () =>
      fnType({
        data: {
          name: typeName,
          nightlyPriceKz: nightly,
          hourlyPriceKz: hourly > 0 ? hourly : null,
          hourlyBlockMinutes: block,
        },
      }),
    onSuccess: () => {
      setTypeName("");
      return done("Tipo de quarto criado.");
    },
    onError: (e) => toast.error(err(e)),
  });
  const roomM = useMutation({
    mutationFn: () => fnRoom({ data: { name: roomName, roomTypeId: roomType || board.roomTypes[0]!.id } }),
    onSuccess: () => {
      setRoomName("");
      return done("Quarto criado.");
    },
    onError: (e) => toast.error(err(e)),
  });

  return (
    <section className="surface-card space-y-5 p-5" aria-labelledby="gestao-titulo">
      <h2 id="gestao-titulo" className="font-display text-base font-bold text-foreground">
        Quartos e preços
      </h2>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          typeM.mutate();
        }}
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="rt-name">Novo tipo de quarto</Label>
          <Input id="rt-name" placeholder="Ex.: Standard" value={typeName} onChange={(e) => setTypeName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rt-night">Preço por noite (Kz)</Label>
          <Input id="rt-night" type="number" min={1} value={nightly || ""} onChange={(e) => setNightly(Number(e.target.value) || 0)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rt-hour">Preço por período (Kz, opcional)</Label>
          <Input id="rt-hour" type="number" min={0} value={hourly || ""} onChange={(e) => setHourly(Number(e.target.value) || 0)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rt-block">Duração do período (min)</Label>
          <Input id="rt-block" type="number" min={30} step={30} value={block} onChange={(e) => setBlock(Number(e.target.value) || 120)} />
        </div>
        <Button type="submit" className="self-end" disabled={typeM.isPending}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Criar tipo
        </Button>
      </form>

      {board.roomTypes.length > 0 ? (
        <form
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            roomM.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="room-name">Novo quarto</Label>
            <Input id="room-name" placeholder="Ex.: 07" value={roomName} onChange={(e) => setRoomName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="room-type">Tipo</Label>
            <Select value={roomType || board.roomTypes[0]!.id} onValueChange={setRoomType}>
              <SelectTrigger id="room-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {board.roomTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} · {formatMoney(t.nightlyPriceKz)}
                    {t.hourlyPriceKz ? ` / ${formatMoney(t.hourlyPriceKz)} ${t.hourlyBlockMinutes / 60}h` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={roomM.isPending}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Criar quarto
          </Button>
        </form>
      ) : null}
    </section>
  );
}
