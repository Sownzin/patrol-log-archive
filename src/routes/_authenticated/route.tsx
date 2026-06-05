import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Archive, LayoutDashboard, LogOut, UserCircle2, Users, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { usePresence } from "@/hooks/use-presence";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const sync = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id);
      if (data.user) {
        const { data: r } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!r);
      } else {
        setIsAdmin(false);
      }
    };
    sync();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id);
      if (event === "SIGNED_OUT") navigate({ to: "/auth", replace: true });
      else sync();
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  usePresence(userId);

  async function handleLogout() {
    if (userId) {
      await supabase
        .from("profiles")
        .update({ last_seen: new Date(0).toISOString() })
        .eq("id", userId);
    }
    await supabase.auth.signOut();
  }

  const navLink =
    "inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="h-9 w-9 rounded-md bg-primary/15 border border-primary/40 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight leading-none">PMESP</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                Relatórios
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-primary/15 text-primary" }}
              className={navLink}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Patrulha</span>
            </Link>
            <Link
              to="/arquivo"
              activeProps={{ className: "bg-primary/15 text-primary" }}
              className={navLink}
            >
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Arquivo</span>
            </Link>
            <Link
              to="/usuarios"
              activeProps={{ className: "bg-primary/15 text-primary" }}
              className={navLink}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuários</span>
            </Link>
            {isAdmin && (
              <Link
                to="/cargos"
                activeProps={{ className: "bg-primary/15 text-primary" }}
                className={navLink}
              >
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">Cargos</span>
              </Link>
            )}
            <Link
              to="/perfil"
              activeProps={{ className: "bg-primary/15 text-primary" }}
              className={navLink}
            >
              <UserCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-1">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Sair</span>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        Sistema interno de relatórios — Polícia Militar do Estado de São Paulo
      </footer>
    </div>
  );
}
