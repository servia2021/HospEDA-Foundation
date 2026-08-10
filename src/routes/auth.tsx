import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/brand";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar no HOSPEDA — Gestão de hospedagens em Angola" },
      {
        name: "description",
        content:
          "Aceda à sua conta HOSPEDA para acompanhar quartos, caixa e operação da sua hospedaria em Angola.",
      },
      { property: "og:title", content: "Entrar no HOSPEDA" },
      {
        property: "og:description",
        content: "Acesso seguro à gestão da sua hospedaria, pousada ou pequeno hotel.",
      },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

type Mode = "entrar" | "criar";

function AuthPage() {
  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        window.location.assign("/dashboard");
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setAwaitingConfirm(true);
          toast.success("Conta criada. Confirme o email para entrar.");
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível continuar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 inline-flex">
            <Brand showTagline />
          </Link>

          <div className="surface-card p-6 sm:p-7">
            <h1 className="font-display text-xl font-extrabold text-foreground">
              {mode === "entrar" ? "Entrar na sua conta" : "Criar conta"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === "entrar"
                ? "Acompanhe a operação e o dinheiro da sua hospedaria."
                : "Comece por criar o acesso do proprietário."}
            </p>

            {awaitingConfirm ? (
              <div className="mt-5 rounded-xl bg-primary-soft p-4 text-sm text-foreground">
                Enviámos um email de confirmação para <strong>{email}</strong>. Confirme para
                concluir o registo e configurar o estabelecimento.
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {mode === "criar" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex.: Ana Cardoso"
                    autoComplete="name"
                    required
                  />
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@exemplo.co.ao"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Palavra-passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  autoComplete={mode === "entrar" ? "current-password" : "new-password"}
                  required
                />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {mode === "entrar" ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode(mode === "entrar" ? "criar" : "entrar");
                setAwaitingConfirm(false);
              }}
              className="mt-5 w-full text-sm font-semibold text-primary"
            >
              {mode === "entrar" ? "Ainda não tenho conta" : "Já tenho conta — entrar"}
            </button>
          </div>

          <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Cada estabelecimento tem os seus dados isolados. Os acessos são controlados por papel.
          </p>
        </div>
      </div>
    </div>
  );
}
