import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Archive, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

type Report = {
  id: string;
  rg: string;
  nome_guerra: string;
  graduacao: string;
  viatura: string;
  equipe: string;
  inicio: string;
  fim: string | null;
  km_inicial: number;
  km_final: number | null;
  ocorrencias: string | null;
  status: string;
};

export const Route = createFileRoute("/_authenticated/arquivo")({
  head: () => ({
    meta: [
      { title: "Arquivo — PMESP" },
      { name: "description", content: "Relatórios de patrulha arquivados." },
    ],
  }),
  component: ArquivoPage,
});

function ArquivoPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("patrol_reports")
      .select("*")
      .in("status", ["arquivado", "finalizado"])
      .order("inicio", { ascending: false });
    if (error) toast.error(error.message);
    setReports((data as Report[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    if (!confirm("Excluir definitivamente este relatório?")) return;
    const { error } = await supabase.from("patrol_reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Relatório excluído");
    setReports((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Archive className="h-6 w-6 text-primary" />
          Arquivo de relatórios
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Relatórios já finalizados e arquivados.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : reports.length === 0 ? (
        <Card className="p-12 text-center">
          <Archive className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum relatório arquivado ainda.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const open = openId === r.id;
            const dur = r.fim
              ? Math.round((new Date(r.fim).getTime() - new Date(r.inicio).getTime()) / 60000)
              : null;
            return (
              <Card key={r.id} className="overflow-hidden">
                <button
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="w-full p-4 flex items-center justify-between gap-4 hover:bg-secondary/40 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{r.graduacao} {r.nome_guerra}</span>
                      <Badge variant={r.status === "arquivado" ? "secondary" : "default"} className="text-[10px] uppercase">
                        {r.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(r.inicio).toLocaleString("pt-BR")} · VTR {r.viatura} · Equipe {r.equipe}
                      {dur !== null && <> · {Math.floor(dur / 60)}h{String(dur % 60).padStart(2, "0")}</>}
                    </div>
                  </div>
                  {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                </button>

                {open && (
                  <div className="border-t border-border/60 p-4 space-y-4 bg-background/40">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <Cell label="RG" value={r.rg} />
                      <Cell label="Início" value={new Date(r.inicio).toLocaleString("pt-BR")} />
                      <Cell label="Fim" value={r.fim ? new Date(r.fim).toLocaleString("pt-BR") : "—"} />
                      <Cell label="KM" value={`${r.km_inicial} → ${r.km_final ?? "—"}`} />
                    </div>
                    {r.ocorrencias && (
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                          Ocorrências
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{r.ocorrencias}</p>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => remove(r.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
