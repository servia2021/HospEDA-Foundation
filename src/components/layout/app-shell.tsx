import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, MoreHorizontal, Wifi, User2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/brand";
import { NAV_ITEMS, type NavItem } from "@/lib/navigation";
import { ROLE_LABELS } from "@/lib/roles";
import { useAccess } from "@/hooks/useSessionContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

function useVisibleNav(): NavItem[] {
  const { can, isLoading } = useAccess();
  if (isLoading) return [...NAV_ITEMS];
  return NAV_ITEMS.filter((item) => can(item.permission));
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{item.label}</span>
      {item.upcoming ? (
        <span className="ml-auto shrink-0 rounded-md bg-sidebar-border px-1.5 py-0.5 text-[10px] font-bold text-sidebar-foreground/70">
          breve
        </span>
      ) : null}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const items = useVisibleNav();
  const { session, role, isLoading } = useAccess();
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);
  const onOnboarding = pathname.startsWith("/onboarding");
  const needsOnboarding = !isLoading && Boolean(session) && !session?.establishment;

  // Sem estabelecimento não existe operação possível: encaminhar para o registo inicial.
  useEffect(() => {
    if (needsOnboarding && !onOnboarding) {
      void navigate({ to: "/onboarding", replace: true });
    }
  }, [needsOnboarding, onOnboarding, navigate]);

  const primary = items.filter((item) => item.primary).slice(0, 4);
  const secondary = items.filter((item) => !primary.includes(item));

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar — desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar px-3 py-4 lg:flex">
        <div className="px-2 pb-4">
          <Brand tone="dark" showTagline />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Navegação principal">
          {items.map((item) => (
            <SidebarLink key={item.to} item={item} active={isActive(item.to)} />
          ))}
        </nav>
        <div className="mt-3 rounded-xl bg-sidebar-accent/60 p-3">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">
            {session?.establishment?.name ?? "Sem estabelecimento"}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/60">
            {role ? ROLE_LABELS[role] : "Sem papel atribuído"}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 flex w-full items-center gap-2 rounded-lg bg-sidebar px-2.5 py-2 text-xs font-bold text-sidebar-foreground/80 transition-colors hover:text-sidebar-foreground"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Terminar sessão
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="lg:hidden">
              <Brand />
            </div>
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-sm font-bold text-foreground">
                {session?.establishment?.name ?? "HOSPEDA"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {session?.establishment?.city ?? "Angola"} ·{" "}
                {session?.establishment?.currency ?? "AOA"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="hidden gap-1.5 sm:flex">
              <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
              Cloud
            </Badge>
            <Link
              to="/configuracoes"
              className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground"
              aria-label="Conta e configurações"
            >
              <User2 className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 sm:pt-6 lg:pb-10">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>

      {/* Bottom navigation — telemóvel */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden"
        style={{ boxShadow: "var(--shadow-float)" }}
        aria-label="Navegação inferior"
      >
        <ul className="grid grid-cols-5">
          {primary.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-semibold",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span className="truncate">{item.shortLabel}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="flex w-full flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-semibold text-muted-foreground"
                >
                  <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                  <span>Mais</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle className="font-display">Mais opções</SheetTitle>
                </SheetHeader>
                <div className="grid gap-1.5 px-4 pb-2">
                  {secondary.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-3 rounded-xl bg-surface px-3 py-3 text-sm font-semibold text-foreground"
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0 truncate">{item.label}</span>
                        {item.upcoming ? (
                          <span className="ml-auto shrink-0 text-[10px] font-bold text-muted-foreground">
                            breve
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
                <div className="px-4 pb-6">
                  <Button variant="outline" className="w-full" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Terminar sessão
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </li>
        </ul>
      </nav>
    </div>
  );
}
