import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Archive, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

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

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
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

          <nav className="flex items-center gap-1">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-primary/15 text-primary" }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Patrulha</span>
            </Link>
            <Link
              to="/viatura"
              activeProps={{ className: "bg-primary/15 text-primary" }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Car className="h-4 w-4" />
              <span className="hidden sm:inline">Viatura</span>
            </Link>

            <Link
              to="/arquivo"
              activeProps={{ className: "bg-primary/15 text-primary" }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">Arquivo</span>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-2">
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
