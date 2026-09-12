import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAppRole, type AppRole } from "@/lib/roles";

export type TeamMember = {
  userId: string;
  fullName: string | null;
  email: string | null;
  role: AppRole | null;
  isSelf: boolean;
};

export type TeamInvite = {
  id: string;
  email: string;
  role: AppRole;
  createdAt: string;
};

export type TeamOverview = {
  members: TeamMember[];
  invites: TeamInvite[];
};

const assignableRole = z.enum(["administrador", "recepcionista"]);

/** Garante que o utilizador atual é Proprietário/Administrador do seu estabelecimento. */
async function requireManager(context: {
  supabase: import("@supabase/supabase-js").SupabaseClient<
    import("@/integrations/supabase/types").Database
  >;
  userId: string;
}) {
  const { supabase, userId } = context;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("establishment_id")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile?.establishment_id) throw new Error("Nenhum estabelecimento associado.");

  const { data: isManager, error: roleError } = await supabase.rpc("is_manager", {
    _user_id: userId,
    _establishment_id: profile.establishment_id,
  });
  if (roleError) throw new Error(roleError.message);
  if (!isManager) throw new Error("Não tem permissão para gerir a equipa.");

  return { establishmentId: profile.establishment_id as string };
}

/** Emails dos membros (auth.users só é acessível com privilégios de serviço). */
async function emailsByUserId(userIds: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (userIds.length === 0) return map;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      map.set(id, data?.user?.email ?? null);
    }),
  );
  return map;
}

/** Lista membros e convites pendentes do estabelecimento ativo. */
export const getTeamOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TeamOverview> => {
    const { supabase, userId } = context;
    const { establishmentId } = await requireManager({ supabase, userId });

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("establishment_id", establishmentId);
    if (profilesError) throw new Error(profilesError.message);

    const { data: roleRows, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("establishment_id", establishmentId);
    if (rolesError) throw new Error(rolesError.message);

    const roleByUser = new Map<string, AppRole>();
    for (const row of roleRows ?? []) {
      const value = row.role as string;
      if (isAppRole(value)) roleByUser.set(row.user_id, value);
    }

    const ids = (profiles ?? []).map((p) => p.id);
    const emails = await emailsByUserId(ids);

    const members: TeamMember[] = (profiles ?? [])
      .map((p) => ({
        userId: p.id,
        fullName: p.full_name,
        email: emails.get(p.id) ?? null,
        role: roleByUser.get(p.id) ?? null,
        isSelf: p.id === userId,
      }))
      .sort((a, b) => {
        const order: Record<string, number> = {
          proprietario: 0,
          administrador: 1,
          recepcionista: 2,
        };
        return (order[a.role ?? "recepcionista"] ?? 3) - (order[b.role ?? "recepcionista"] ?? 3);
      });

    const { data: inviteRows, error: invitesError } = await supabase
      .from("establishment_invites")
      .select("id, email, role, created_at")
      .eq("establishment_id", establishmentId)
      .eq("status", "pendente")
      .order("created_at", { ascending: false });
    if (invitesError) throw new Error(invitesError.message);

    const invites: TeamInvite[] = (inviteRows ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role as AppRole,
      createdAt: row.created_at,
    }));

    return { members, invites };
  });

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Indique um email válido").max(160),
  role: assignableRole,
  redirectTo: z.string().trim().url().optional(),
});

export type InviteResult = {
  outcome: "membro_adicionado" | "convite_enviado" | "convite_pendente";
  email: string;
};

/**
 * Convida um utilizador para o estabelecimento ativo.
 * O establishment_id vem sempre do perfil de quem convida — nunca do cliente.
 */
export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inviteSchema.parse(data))
  .handler(async ({ context, data }): Promise<InviteResult> => {
    const { supabase, userId } = context;
    const { establishmentId } = await requireManager({ supabase, userId });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Procura uma conta existente com este email.
    let existing: { id: string } | null = null;
    for (let page = 1; page <= 10 && !existing; page += 1) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw new Error(error.message);
      const match = (list?.users ?? []).find(
        (user) => (user.email ?? "").toLowerCase() === data.email,
      );
      if (match) existing = { id: match.id };
      if ((list?.users ?? []).length < 200) break;
    }

    if (existing) {
      const { data: targetProfile, error: targetError } = await supabaseAdmin
        .from("profiles")
        .select("id, establishment_id")
        .eq("id", existing.id)
        .maybeSingle();
      if (targetError) throw new Error(targetError.message);

      if (targetProfile?.establishment_id && targetProfile.establishment_id !== establishmentId) {
        throw new Error("Este email já pertence a outro estabelecimento.");
      }

      if (!targetProfile?.establishment_id) {
        const { error: linkError } = await supabaseAdmin
          .from("profiles")
          .update({ establishment_id: establishmentId })
          .eq("id", existing.id);
        if (linkError) throw new Error(linkError.message);
      }

      const { data: currentRole } = await supabase
        .from("user_roles")
        .select("id, role")
        .eq("establishment_id", establishmentId)
        .eq("user_id", existing.id)
        .maybeSingle();

      if (currentRole?.role === "proprietario") {
        throw new Error("O Proprietário não é gerido por este ecrã.");
      }

      if (currentRole) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: data.role })
          .eq("id", currentRole.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: existing.id, establishment_id: establishmentId, role: data.role });
        if (error) throw new Error(error.message);
      }

      return { outcome: "membro_adicionado", email: data.email };
    }

    // Sem conta: registamos um convite pendente (aceito automaticamente no registo).
    const { error: inviteError } = await supabase.from("establishment_invites").insert({
      establishment_id: establishmentId,
      email: data.email,
      role: data.role,
      invited_by: userId,
      status: "pendente",
    });
    if (inviteError) {
      if (inviteError.code === "23505" || inviteError.code === "23P01") {
        throw new Error("Já existe um convite pendente para este email.");
      }
      throw new Error(inviteError.message);
    }

    const { error: mailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: data.redirectTo,
    });

    return {
      outcome: mailError ? "convite_pendente" : "convite_enviado",
      email: data.email,
    };
  });

const changeRoleSchema = z.object({
  userId: z.string().uuid(),
  role: assignableRole,
});

/** Altera o papel de um membro entre Administrador e Recepcionista. */
export const updateTeamMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => changeRoleSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { establishmentId } = await requireManager({ supabase, userId });

    const { data: rows, error } = await supabase
      .from("user_roles")
      .select("id, role")
      .eq("establishment_id", establishmentId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) throw new Error("Membro não encontrado nesta equipa.");
    if (rows.some((row) => row.role === "proprietario")) {
      throw new Error("O papel do Proprietário não pode ser alterado aqui.");
    }

    const { error: updateError } = await supabase
      .from("user_roles")
      .update({ role: data.role })
      .eq("id", rows[0]!.id);
    if (updateError) throw new Error(updateError.message);

    return { ok: true as const };
  });

const removeSchema = z.object({ userId: z.string().uuid() });

/** Remove o acesso de um membro ao estabelecimento (nunca o Proprietário nem a própria conta). */
export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => removeSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { establishmentId } = await requireManager({ supabase, userId });

    if (data.userId === userId) throw new Error("Não pode remover o seu próprio acesso.");

    const { data: rows, error } = await supabase
      .from("user_roles")
      .select("id, role")
      .eq("establishment_id", establishmentId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) throw new Error("Membro não encontrado nesta equipa.");
    if (rows.some((row) => row.role === "proprietario")) {
      throw new Error("O Proprietário não pode ser removido.");
    }

    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("establishment_id", establishmentId)
      .eq("user_id", data.userId);
    if (deleteError) throw new Error(deleteError.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: unlinkError } = await supabaseAdmin
      .from("profiles")
      .update({ establishment_id: null })
      .eq("id", data.userId)
      .eq("establishment_id", establishmentId);
    if (unlinkError) throw new Error(unlinkError.message);

    await supabase.from("audit_logs").insert({
      establishment_id: establishmentId,
      actor_id: userId,
      action: "equipa.membro_removido",
      entity: "profiles",
      entity_id: data.userId,
      metadata: {},
    });

    return { ok: true as const };
  });

const cancelInviteSchema = z.object({ inviteId: z.string().uuid() });

/** Cancela um convite pendente. */
export const cancelTeamInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => cancelInviteSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { establishmentId } = await requireManager({ supabase, userId });

    const { data: updated, error } = await supabase
      .from("establishment_invites")
      .update({ status: "cancelado" })
      .eq("id", data.inviteId)
      .eq("establishment_id", establishmentId)
      .eq("status", "pendente")
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Convite não encontrado.");

    return { ok: true as const };
  });
