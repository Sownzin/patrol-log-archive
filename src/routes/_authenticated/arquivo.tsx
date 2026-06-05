import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Archive, Trash2, ChevronDown, ChevronUp, Copy, Car, Shield } from "lucide-react";
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

type ViaturaReport = {
  id: string;
  horario_entrada: string;
  horario_saida: string;
  setor_batalhao: string;
  prefixo: string;
  placa: string;
  observacoes: string | null;
  num_prisoes: number;
  dinheiro_sujo: number;
  cocaina: number;
  maconha: number;
  metanfetamina: number;
  five_seven: number;
  ak47: number;
  uzi: number;
  pdw: number;
  municao_380: number;
  municao_762: number;
  ticket_corrida: number;
  lockpick: number;
  diamantes: number;
  c4: number;
  motorista: string;
  chefe_barca: string;
  auxiliar: string | null;
  anotador: string | null;
  status: string;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/arquivo")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Arquivo — PMESP" },
      { name: "description", content: "Relatórios arquivados." },
    ],
  }),
  component: ArquivoPage,
});

function ArquivoPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [viaturaReports, setViaturaReports] = useState<ViaturaReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: patrol, error: e1 }, { data: viatura, error: e2 }] = await Promise.all([
      supabase
        .from("patrol_reports")
        .select("*")
        .eq("status", "arquivado")
        .order("inicio", { ascending: false }),
      supabase
        .from("viatura_reports")
        .select("*")
        .eq("status", "arquivado")
        .order("created_at", { ascending: false }),
    ]);
    if (e1) toast.error(e1.message);
    if (e2) toast.error(e2.message);
    setReports((patrol as Report[]) ?? []);
    setViaturaReports((viatura as ViaturaReport[]) ?? []);
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

  async function removeViatura(id: string) {
    if (!confirm("Excluir definitivamente este relatório?")) return;
    const { error } = await supabase.from("viatura_reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Relatório excluído");
    setViaturaReports((r) => r.filter((x) => x.id !== id));
  }

  async function unarchiveViatura(id: string) {
    const { error } = await supabase.from("viatura_reports").update({ status: "finalizado" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Desarquivado");
    setViaturaReports((r) => r.filter((x) => x.id !== id));
  }

  function copyViatura(r: ViaturaReport) {
    navigator.clipboard.writeText(formatViatura(r));
    toast.success("Relatório copiado");
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Archive className="h-6 w-6 text-primary" />
          Arquivo de relatórios
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Relatórios arquivados de patrulha e viatura.
        </p>
      </div>

      <Tabs defaultValue="viatura" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="viatura" className="gap-2"><Car className="h-4 w-4" />Viatura ({viaturaReports.length})</TabsTrigger>
          <TabsTrigger value="patrulha" className="gap-2"><Shield className="h-4 w-4" />Patrulha ({reports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="viatura" className="mt-4">
          {loading ? (
            <p className="text-muted-foreground">Carregando…</p>
          ) : viaturaReports.length === 0 ? (
            <Card className="p-12 text-center">
              <Archive className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum relatório de viatura arquivado.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {viaturaReports.map((r) => {
                const open = openId === r.id;
                return (
                  <Card key={r.id} className="overflow-hidden">
                    <button
                      onClick={() => setOpenId(open ? null : r.id)}
                      className="w-full p-4 flex items-center justify-between gap-4 hover:bg-secondary/40 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">VTR {r.placa} · {r.prefixo}</span>
                          <Badge variant="secondary" className="text-[10px] uppercase">{r.num_prisoes} prisões</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(r.created_at).toLocaleString("pt-BR")} · {r.setor_batalhao} · {r.horario_entrada}→{r.horario_saida}
                        </div>
                      </div>
                      {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                    </button>
                    {open && (
                      <div className="border-t border-border/60 p-4 bg-background/40 space-y-4">
                        <pre className="text-xs whitespace-pre-wrap font-mono bg-secondary/40 p-3 rounded border border-border/60 max-h-96 overflow-auto">
                          {formatViatura(r)}
                        </pre>
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Button size="sm" variant="secondary" onClick={() => copyViatura(r)}>
                            <Copy className="h-4 w-4 mr-2" />Copiar
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => unarchiveViatura(r.id)}>
                            Desarquivar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => removeViatura(r.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />Excluir
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="patrulha" className="mt-4">
          {loading ? (
            <p className="text-muted-foreground">Carregando…</p>
          ) : reports.length === 0 ? (
            <Card className="p-12 text-center">
              <Archive className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum relatório de patrulha arquivado.</p>
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
                          <Badge variant="secondary" className="text-[10px] uppercase">{r.status}</Badge>
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
        </TabsContent>
      </Tabs>
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

function formatViatura(r: ViaturaReport): string {
  const sep = "———————————————————————";
  return [
    "📝 Painel de Relatório - Viatura",
    sep,
    "RELATÓRIO - VIATURA",
    sep,
    `⏰ Horário de Entrada: ${r.horario_entrada}`,
    `⏰ Horário de Saída: ${r.horario_saida}`,
    sep,
    `🗺️ Setor/Batalhão: ${r.setor_batalhao}`,
    `📻 Prefixo da unidade: ${r.prefixo}`,
    `🚔 Placa da viatura: ${r.placa}`,
    sep,
    `📌 Observações: ${r.observacoes ?? ""}`,
    sep,
    `🔗 Nº de Prisões: ${r.num_prisoes}`,
    sep,
    "⬇️ ITENS APREENDIDOS ⬇️",
    "",
    `DINHEIRO SUJO: ${r.dinheiro_sujo}`,
    "——————————————",
    "DROGAS",
    `Cocaína: ${r.cocaina}`,
    `Maconha: ${r.maconha}`,
    `Metanfetamina: ${r.metanfetamina}`,
    sep,
    "ARMAS",
    `Five seven: ${r.five_seven}`,
    `Ak 47: ${r.ak47}`,
    `Uzi: ${r.uzi}`,
    `PDW: ${r.pdw}`,
    sep,
    "MUNIÇÃO",
    `Munição .380: ${r.municao_380}`,
    `Munição 7.62: ${r.municao_762}`,
    sep,
    "DIVERSOS",
    `Ticket corrida ilegal: ${r.ticket_corrida}`,
    `lockpick: ${r.lockpick}`,
    `Diamantes: ${r.diamantes}`,
    `C4: ${r.c4}`,
    sep,
    `👮‍♂️ Motorista: ${r.motorista}`,
    `👮‍♂️ Chefe de Barca: ${r.chefe_barca}`,
    `👮‍♂️ Auxiliar: ${r.auxiliar ?? "—"}`,
    `👮‍♂️ Anotador: ${r.anotador ?? "—"}`,
    sep,
  ].join("\n");
}
