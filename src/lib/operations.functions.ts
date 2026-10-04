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
