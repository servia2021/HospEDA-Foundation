import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSessionContext, type SessionContext } from "@/lib/session.functions";
import { can, highestRole, type Permission } from "@/lib/roles";

export const SESSION_QUERY_KEY = ["session-context"] as const;

export function useSessionContext(): UseQueryResult<SessionContext> {
  const fetchSession = useServerFn(getSessionContext);

  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => fetchSession(),
    staleTime: 60_000,
    retry: 1,
  });
}

/** Helpers de permissão derivados da sessão. */
export function useAccess() {
  const { data, isLoading } = useSessionContext();
  const roles = data?.roles ?? [];

  return {
    isLoading,
    roles,
    role: highestRole(roles),
    session: data ?? null,
    can: (permission: Permission) => can(roles, permission),
  };
}
