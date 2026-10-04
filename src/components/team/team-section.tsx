import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Mail, UserPlus, Users, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ROLE_LABELS } from "@/lib/roles";
import {
  cancelTeamInvite,
  getTeamOverview,
  inviteTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
  type TeamMember,
} from "@/lib/team.functions";

type AssignableRole = "administrador" | "recepcionista";
const TEAM_QUERY_KEY = ["team-overview"] as const;

type Pending =
  | { kind: "role"; member: TeamMember; role: AssignableRole }
  | { kind: "remove"; member: TeamMember }
  | { kind: "cancel"; inviteId: string; email: string }
  | null;

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Ocorreu um erro. Tente novamente.";
}

export function TeamSection() {
  const queryClient = useQueryClient();
  const fetchTeam = useServerFn(getTeamOverview);
  const invite = useServerFn(inviteTeamMember);
  const changeRole = useServerFn(updateTeamMemberRole);
  const remove = useServerFn(removeTeamMember);
  const cancel = useServerFn(cancelTeamInvite);

  const team = useQuery({ queryKey: TEAM_QUERY_KEY, queryFn: () => fetchTeam(), retry: 1 });

  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<AssignableRole>("recepcionista");
  const [pending, setPending] = useState<Pending>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY });

  const inviteMutation = useMutation({
    mutationFn: () => invite({ data: { email, role: newRole } }),
    onSuccess: async (result) => {
      setEmail("");
      await refresh();
      toast.success(
        result.outcome === "membro_adicionado"
          ? `${result.email} foi adicionado à equipa.`
          : result.outcome === "convite_enviado"
            ? `Convite enviado por email para ${result.email}.`
            : `Convite registado para ${result.email}. A pessoa entra ao criar conta com este email.`,
      );
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const actionMutation = useMutation({
    mutationFn: async (action: NonNullable<Pending>) => {
      if (action.kind === "role")
        return changeRole({ data: { userId: action.member.userId, role: action.role } });
      if (action.kind === "remove") return remove({ data: { userId: action.member.userId } });
      return cancel({ data: { inviteId: action.inviteId } });
    },
    onSuccess: async (_r, action) => {
      setPending(null);
      await refresh();
      toast.success(
        action.kind === "role"
          ? "Papel alterado."
          : action.kind === "remove"
            ? "Acesso removido."
            : "Convite cancelado.",
      );
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const confirmText = (() => {
    if (!pending) return { title: "", body: "", cta: "" };
    const name = pending.kind === "cancel" ? pending.email : pending.member.fullName || pending.member.email || "este membro";
    if (pending.kind === "role")
      return {
        title: "Alterar papel?",
        body: `${name} passa a ser ${ROLE_LABELS[pending.role]}.`,
        cta: "Alterar papel",
      };
    if (pending.kind === "remove")
      return {
        title: "Remover acesso?",
        body: `${name} deixa de conseguir entrar neste estabelecimento.`,
        cta: "Remover",
      };
    return { title: "Cancelar convite?", body: `O convite para ${name} deixa de ser válido.`, cta: "Cancelar convite" };
  })();

  return (
    <section className="surface-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Users className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="min-w-0 truncate font-display text-base font-bold text-foreground">Equipa</h2>
      </div>
      <Separator className="my-4" />

      <form
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          inviteMutation.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="nome@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-role">Papel</Label>
          <Select value={newRole} onValueChange={(v) => setNewRole(v as AssignableRole)}>
            <SelectTrigger id="invite-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recepcionista">{ROLE_LABELS.recepcionista}</SelectItem>
              <SelectItem value="administrador">{ROLE_LABELS.administrador}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={inviteMutation.isPending}>
          {inviteMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus className="h-4 w-4" aria-hidden="true" />
          )}
          Convidar
        </Button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">
        A pessoa entra automaticamente nesta equipa quando criar conta com este email.
      </p>

      <h3 className="mt-6 text-sm font-bold text-foreground">Membros</h3>
      {team.isLoading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : team.isError ? (
        <div className="mt-3 space-y-2 text-sm text-destructive">
          <p>{errorText(team.error)}</p>
          <Button variant="outline" size="sm" onClick={() => team.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <ul className="mt-3 grid gap-2.5">
          {team.data?.members.map((member) => {
            const locked = member.role === "proprietario" || member.isSelf;
            return (
              <li
                key={member.userId}
                className="flex flex-col gap-3 rounded-xl bg-surface px-3.5 py-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {member.fullName || member.email || "Sem nome"}
                    {member.isSelf ? <span className="text-muted-foreground"> (você)</span> : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{member.email ?? "—"}</p>
                </div>
                {locked ? (
                  <Badge variant="secondary" className="self-start sm:self-auto">
                    {member.role ? ROLE_LABELS[member.role] : "Sem papel"}
                  </Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select
                      value={member.role ?? ""}
                      onValueChange={(v) =>
                        setPending({ kind: "role", member, role: v as AssignableRole })
                      }
                    >
                      <SelectTrigger className="h-9 w-40" aria-label="Papel do membro">
                        <SelectValue placeholder="Sem papel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recepcionista">{ROLE_LABELS.recepcionista}</SelectItem>
                        <SelectItem value="administrador">{ROLE_LABELS.administrador}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover acesso"
                      onClick={() => setPending({ kind: "remove", member })}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {team.data && team.data.invites.length > 0 ? (
        <>
          <h3 className="mt-6 text-sm font-bold text-foreground">Convites pendentes</h3>
          <ul className="mt-3 grid gap-2.5">
            {team.data.invites.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3.5 py-3"
              >
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABELS[inv.role]} · Pendente
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Cancelar convite"
                  onClick={() => setPending({ kind: "cancel", inviteId: inv.id, email: inv.email })}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmText.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmText.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionMutation.isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (pending) actionMutation.mutate(pending);
              }}
            >
              {actionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {confirmText.cta}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
