import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Operações da hospedagem. Toda a autorização e regras vivem nas funções SQL `op_*`
 * (SECURITY DEFINER, validam auth.uid() e papel); aqui apenas validamos a forma dos dados.
 */

const uuid = z.string().uuid();
const kz = z.number().int().positive().max(100_000_000);
const method = z.enum(["dinheiro", "tpa_transferencia", "outro"]);
const optText = (max: number) => z.string().trim().max(max).optional().nullable();

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export const upsertRoomType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional().nullable(),
        name: z.string().trim().min(1).max(80),
        description: optText(300),
        nightlyPriceKz: kz,
        hourlyPriceKz: kz.optional().nullable(),
        hourlyBlockMinutes: z.number().int().min(30).max(1440).optional().nullable(),
        active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) =>
    unwrap(
      await context.supabase.rpc("op_upsert_room_type", {
        _id: data.id ?? null,
        _name: data.name,
        _description: data.description ?? null,
        _nightly_price_kz: data.nightlyPriceKz,
        _hourly_price_kz: data.hourlyPriceKz ?? null,
        _hourly_block_minutes: data.hourlyBlockMinutes ?? null,
        _active: data.active ?? true,
      } as never),
    ) as string,
  );

export const upsertRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional().nullable(),
        roomTypeId: uuid,
        name: z.string().trim().min(1).max(40),
        active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) =>
    unwrap(
      await context.supabase.rpc("op_upsert_room", {
        _id: data.id ?? null,
        _room_type_id: data.roomTypeId,
        _name: data.name,
        _active: data.active ?? true,
      } as never),
    ) as string,
  );

export const setRoomMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ roomId: uuid, on: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    unwrap(await context.supabase.rpc("op_set_room_maintenance", { _room_id: data.roomId, _on: data.on }));
    return { ok: true as const };
  });

export const markRoomReady = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ roomId: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    unwrap(await context.supabase.rpc("op_mark_room_ready", { _room_id: data.roomId }));
    return { ok: true as const };
  });

export const createGuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ fullName: z.string().trim().min(1).max(120), phone: optText(30), documentRef: optText(60) })
      .parse(d),
  )
  .handler(async ({ context, data }) =>
    unwrap(
      await context.supabase.rpc("op_create_guest", {
        _full_name: data.fullName,
        _phone: data.phone ?? null,
        _document_ref: data.documentRef ?? null,
      } as never),
    ) as string,
  );

const startBase = { roomId: uuid, guestId: uuid, units: z.number().int().min(1).max(365), agreedAmount: kz };

/** Entrada por noite: pagamento na entrada opcional (parcial permitido). */
export const startNightStay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ ...startBase, payment: z.object({ amount: kz, method }).optional().nullable() })
      .parse(d),
  )
  .handler(async ({ context, data }) =>
    unwrap(
      await context.supabase.rpc("op_start_stay", {
        _room_id: data.roomId,
        _guest_id: data.guestId,
        _mode: "noite",
        _units: data.units,
        _agreed_amount: data.agreedAmount,
        _payment_amount: data.payment?.amount ?? null,
        _payment_method: data.payment?.method ?? null,
      } as never),
    ) as string,
  );

/** Entrada por horas: pagamento total obrigatório na mesma transação. */
export const startHourlyStay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ ...startBase, payment: z.object({ amount: kz, method }) }).parse(d),
  )
  .handler(async ({ context, data }) =>
    unwrap(
      await context.supabase.rpc("op_start_stay", {
        _room_id: data.roomId,
        _guest_id: data.guestId,
        _mode: "horas",
        _units: data.units,
        _agreed_amount: data.agreedAmount,
        _payment_amount: data.payment.amount,
        _payment_method: data.payment.method,
      }),
    ),
  );

export const extendHourlyStay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ stayId: uuid, units: z.number().int().min(1).max(24), amount: kz, method }).parse(d),
  )
  .handler(async ({ context, data }) => {
    unwrap(
      await context.supabase.rpc("op_extend_hourly_stay", {
        _stay_id: data.stayId,
        _units: data.units,
        _payment_amount: data.amount,
        _payment_method: data.method,
      }),
    );
    return { ok: true as const };
  });

export const addPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ stayId: uuid, amount: kz, method, note: optText(200) }).parse(d),
  )
  .handler(async ({ context, data }) =>
    unwrap(
      await context.supabase.rpc("op_add_payment", {
        _stay_id: data.stayId,
        _amount: data.amount,
        _method: data.method,
        _note: data.note ?? null,
      } as never),
    ) as string,
  );

export const voidPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ paymentId: uuid, reason: z.string().trim().min(3).max(200) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    unwrap(await context.supabase.rpc("op_void_payment", { _payment_id: data.paymentId, _reason: data.reason }));
    return { ok: true as const };
  });

export const finishStay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ stayId: uuid, allowDebt: z.boolean().default(false) }).parse(d))
  .handler(async ({ context, data }) => {
    unwrap(await context.supabase.rpc("op_finish_stay", { _stay_id: data.stayId, _allow_debt: data.allowDebt }));
    return { ok: true as const };
  });

export const cancelStay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ stayId: uuid, reason: z.string().trim().min(3).max(200) }).parse(d))
  .handler(async ({ context, data }) => {
    unwrap(await context.supabase.rpc("op_cancel_stay", { _stay_id: data.stayId, _reason: data.reason }));
    return { ok: true as const };
  });

/** Estender hospedagem por horas (não cria nova entrada). */
export const extendStay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        stayId: uuid,
        minutes: z.number().int().min(15).max(1440),
        expectedCheckoutAt: z.string().datetime({ offset: true }),
        amount: z.number().int().min(0).max(100_000_000),
        payNow: z.boolean(),
        method: method.optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const end = unwrap(
      await context.supabase.rpc("op_extend_stay", {
        _stay_id: data.stayId,
        _minutes: data.minutes,
        _expected_checkout_at: data.expectedCheckoutAt,
        _amount: data.amount,
        _pay_now: data.payNow,
        _method: data.method ?? null,
      } as never),
    );
    return { expectedCheckoutAt: end as unknown as string };
  });

export type BoardRoom = {
  id: string;
  name: string;
  status: "livre" | "ocupado" | "limpeza" | "manutencao";
  roomTypeId: string;
  roomTypeName: string;
  nightlyPriceKz: number;
  hourlyPriceKz: number | null;
  hourlyBlockMinutes: number;
  stay: null | {
    id: string;
    mode: "noite" | "horas";
    guestName: string;
    guestPhone: string | null;
    startedAt: string;
    expectedCheckoutAt: string;
    contractedMinutes: number | null;
    agreedAmount: number;
    expectedAmount: number;
    paidKz: number;
  };
};

export type OperationsBoard = {
  serverNow: string;
  timezone: string;
  rooms: BoardRoom[];
  roomTypes: { id: string; name: string; nightlyPriceKz: number; hourlyPriceKz: number | null; hourlyBlockMinutes: number }[];
  receivedTodayKz: number;
};

/** Estado operacional completo do estabelecimento (todos os papéis; RLS isola). */
export const getOperationsBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OperationsBoard> => {
    const sb = context.supabase;
    const [typesR, roomsR, staysR, dayR, estR] = await Promise.all([
      sb.from("room_types").select("id, name, nightly_price_kz, hourly_price_kz, hourly_block_minutes, active").order("name"),
      sb.from("rooms").select("id, name, status, room_type_id, active").eq("active", true),
      sb.from("stays").select("id, room_id, guest_id, mode, started_at, expected_checkout_at, contracted_minutes, agreed_amount, expected_amount").eq("status", "em_curso"),
      sb.rpc("op_current_day_start"),
      sb.from("establishments").select("timezone").limit(1).maybeSingle(),
    ]);
    for (const r of [typesR, roomsR, staysR, dayR]) if (r.error) throw new Error(r.error.message);

    const stays = staysR.data ?? [];
    const stayIds = stays.map((s) => s.id);
    const guestIds = stays.map((s) => s.guest_id);
    const [guestsR, payR, todayR] = await Promise.all([
      guestIds.length ? sb.from("guests").select("id, full_name, phone").in("id", guestIds) : Promise.resolve({ data: [], error: null }),
      stayIds.length ? sb.from("payments").select("stay_id, amount_kz").eq("status", "ativo").in("stay_id", stayIds) : Promise.resolve({ data: [], error: null }),
      sb.from("payments").select("amount_kz").eq("status", "ativo").gte("paid_at", (dayR.data as unknown as string) ?? new Date().toISOString()),
    ]);
    for (const r of [guestsR, payR, todayR]) if (r.error) throw new Error(r.error.message);

    const guests = new Map((guestsR.data ?? []).map((g) => [g.id, g]));
    const paid = new Map<string, number>();
    for (const p of payR.data ?? []) paid.set(p.stay_id, (paid.get(p.stay_id) ?? 0) + p.amount_kz);
    const types = new Map((typesR.data ?? []).map((t) => [t.id, t]));
    const stayByRoom = new Map(stays.map((s) => [s.room_id, s]));

    const rooms: BoardRoom[] = (roomsR.data ?? [])
      .map((r) => {
        const t = types.get(r.room_type_id);
        const s = stayByRoom.get(r.id);
        const g = s ? guests.get(s.guest_id) : undefined;
        return {
          id: r.id,
          name: r.name,
          status: r.status,
          roomTypeId: r.room_type_id,
          roomTypeName: t?.name ?? "",
          nightlyPriceKz: t?.nightly_price_kz ?? 0,
          hourlyPriceKz: t?.hourly_price_kz ?? null,
          hourlyBlockMinutes: t?.hourly_block_minutes ?? 180,
          stay: s
            ? {
                id: s.id,
                mode: s.mode,
                guestName: g?.full_name ?? "—",
                guestPhone: g?.phone ?? null,
                startedAt: s.started_at,
                expectedCheckoutAt: s.expected_checkout_at,
                contractedMinutes: s.contracted_minutes,
                agreedAmount: s.agreed_amount,
                expectedAmount: s.expected_amount,
                paidKz: paid.get(s.id) ?? 0,
              }
            : null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt", { numeric: true }));

    return {
      serverNow: new Date().toISOString(),
      timezone: estR.data?.timezone ?? "Africa/Luanda",
      rooms,
      roomTypes: (typesR.data ?? [])
        .filter((t) => t.active)
        .map((t) => ({ id: t.id, name: t.name, nightlyPriceKz: t.nightly_price_kz, hourlyPriceKz: t.hourly_price_kz, hourlyBlockMinutes: t.hourly_block_minutes })),
      receivedTodayKz: (todayR.data ?? []).reduce((a, p) => a + p.amount_kz, 0),
    };
  });
