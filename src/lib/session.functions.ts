import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAppRole, type AppRole } from "@/lib/roles";
import { DEFAULT_CURRENCY } from "@/lib/currency";

export type Establishment = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  currency: string;
};

export type SessionContext = {
  userId: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  establishment: Establishment | null;
  roles: AppRole[];
};

/** Contexto de sessão: perfil, estabelecimento ativo e papéis. */
export const getSessionContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SessionContext> => {
    const { supabase, userId, claims } = context;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, phone, establishment_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);

    let establishment: Establishment | null = null;
    let roles: AppRole[] = [];

    if (profile?.establishment_id) {
      const { data: est, error: estError } = await supabase
        .from("establishments")
        .select("id, name, phone, address, city, currency")
        .eq("id", profile.establishment_id)
        .maybeSingle();
      if (estError) throw new Error(estError.message);
      establishment = est ?? null;

      const { data: roleRows, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("establishment_id", profile.establishment_id);
      if (rolesError) throw new Error(rolesError.message);
      roles = (roleRows ?? [])
        .map((row) => row.role as string)
        .filter(isAppRole)
        .map((role) => role);
    }

    return {
      userId,
      email: (claims as { email?: string } | null)?.email ?? null,
      fullName: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      establishment,
      roles,
    };
  });

const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Indique o nome do estabelecimento").max(120),
  phone: z.string().trim().min(6, "Indique um telefone válido").max(40),
  city: z.string().trim().min(2, "Indique a cidade").max(80),
  address: z.string().trim().max(200).optional().default(""),
  currency: z.string().trim().min(3).max(3).default(DEFAULT_CURRENCY),
  ownerName: z.string().trim().max(120).optional().default(""),
});

/** Cria o estabelecimento (tenant), liga o utilizador como Proprietário e registra auditoria. */
export const createEstablishment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => onboardingSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("profiles")
      .select("establishment_id")
      .eq("id", userId)
      .maybeSingle();

    if (existing?.establishment_id) {
      return { id: existing.establishment_id, alreadyExisted: true as const };
    }

    const { data: created, error: createError } = await supabase
      .from("establishments")
      .insert({
        name: data.name,
        phone: data.phone,
        city: data.city,
        address: data.address || null,
        currency: data.currency,
        created_by: userId,
      })
      .select("id")
      .single();

    if (createError) throw new Error(createError.message);

    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, establishment_id: created.id, role: "proprietario" });
    if (roleError) throw new Error(roleError.message);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        establishment_id: created.id,
        ...(data.ownerName ? { full_name: data.ownerName } : {}),
      })
      .eq("id", userId);
    if (profileError) throw new Error(profileError.message);

    await supabase.from("audit_logs").insert({
      establishment_id: created.id,
      actor_id: userId,
      action: "establishment.created",
      entity: "establishments",
      entity_id: created.id,
      metadata: { name: data.name, city: data.city },
    });

    return { id: created.id, alreadyExisted: false as const };
  });

const auditSchema = z.object({
  action: z.string().trim().min(3).max(120),
  entity: z.string().trim().max(120).optional(),
  entityId: z.string().trim().max(120).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/** Registro de auditoria genérico — base para os eventos das próximas fases. */
export const logAuditEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => auditSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("establishment_id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.establishment_id) return { ok: false as const };

    const { error } = await supabase.from("audit_logs").insert({
      establishment_id: profile.establishment_id,
      actor_id: userId,
      action: data.action,
      entity: data.entity ?? null,
      entity_id: data.entityId ?? null,
      metadata: JSON.parse(JSON.stringify(data.metadata ?? {})),
    });

    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
