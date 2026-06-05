import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radio, Users, UserPlus, Clock } from "lucide-react";
import { toast } from "sonner";

type ViaturaReport = {
  id: string;
  user_id: string;
  horario_entrada: string;
  setor_batalhao: string;
  prefixo: string;
  placa: string;
  motorista: string;
  chefe_barca: string;
  auxiliar: string | null;
  anotador: string | null;
  colaboradores: string[] | null;
  status: string;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/abertos")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Em aberto — PMESP" },
      { name: "description", content: "Relatórios e patrulhamentos em andamento." },
    ],
  }),
  component: AbertosPage,
});

function usernameFromEmail(email: string | null | undefined) {
  if (!email) return "usuário";
  return email.split("@")[0];
}

function elapsedFrom(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;
}

function AbertosPage() {
  const [list, setList] = useState<ViaturaReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomeCidade, setNomeCidade] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [, setTick] = useState(0);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    setUserId(u.user?.id ?? null);

    // Buscar nome_cidade do perfil
    let nc = "";
    if (u.user?.id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("nome_cidade")
        .eq("id", u.user.id)
        .maybeSingle();
      nc = prof?.nome_cidade ?? "";
    }
    if (!nc) nc = usernameFromEmail(u.user?.email);
    setNomeCidade(nc);

    const { data, error } = await supabase
      .from("viatura_reports")
      .select("*")
      .eq("status", "patrulhando")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setList((data as ViaturaReport[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    const ch = supabase
      .channel("viatura_reports_open")
      .on("postgres_changes", { event: "*", schema: "public", table: "viatura_reports" }, () => load())
      .subscribe();
    return () => { clearInterval(id); supabase.removeChannel(ch); };
  }, []);

  async function join(p: ViaturaReport) {
    const current = p.colaboradores ?? [];
    if (!current.includes(nomeCidade)) {
      const { error } = await supabase
        .from("viatura_reports")
        .update({ colaboradores: [...current, nomeCidade] })
        .eq("id", p.id);
      if (error) return toast.error(error.message);
      toast.success(`Conectado como ${nomeCidade}`);
    }
    window.location.assign("/");
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Radio className="h-6 w-6 text-primary" />
          Relatórios em aberto
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Patrulhamentos iniciados e em andamento. Conecte-se para colaborar.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : list.length === 0 ? (
        <Card className="p-12 text-center">
          <Radio className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">Nenhum patrulhamento em aberto no momento.</p>
          <Link to="/"><Button>Iniciar nova patrulha</Button></Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((p) => {
            const mine = p.user_id === userId || (p.colaboradores ?? []).includes(username);
            return (
              <Card key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                    </span>
                    <span className="font-semibold">VTR {p.placa} · {p.prefixo}</span>
                    <Badge variant="secondary" className="text-[10px]">{p.setor_batalhao}</Badge>
                    <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                      <Clock className="h-3 w-3" />{elapsedFrom(p.created_at)}
                    </Badge>
                    {mine && <Badge className="text-[10px]">Você está nesta</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    Entrada: {p.horario_entrada} · Motorista: {p.motorista} · Chefe: {p.chefe_barca}
                  </div>
                  {(p.colaboradores?.length ?? 0) > 0 && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                      <Users className="h-3 w-3" />
                      {p.colaboradores!.map((c) => (
                        <Badge key={c} variant={c === username ? "default" : "secondary"} className="text-[10px]">{c}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button size="sm" onClick={() => join(p)} variant={mine ? "secondary" : "default"}>
                  {mine ? "Abrir" : (<><UserPlus className="h-4 w-4 mr-1" />Conectar</>)}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
