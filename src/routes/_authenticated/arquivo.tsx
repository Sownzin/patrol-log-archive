import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Archive, Trash2, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { toast } from "sonner";

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
  colaboradores: string[] | null;
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
  const [reports, setReports] = useState<ViaturaReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("viatura_reports")
      .select("*")
      .eq("status", "arquivado")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setReports((data as ViaturaReport[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Excluir definitivamente este relatório?")) return;
    const { error } = await supabase.from("viatura_reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Relatório excluído");
    setReports((r) => r.filter((x) => x.id !== id));
  }

  async function unarchive(id: string) {
    const { error } = await supabase.from("viatura_reports").update({ status: "finalizado" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Desarquivado");
    setReports((r) => r.filter((x) => x.id !== id));
  }

  function copyReport(r: ViaturaReport) {
    navigator.clipboard.writeText(formatReport(r));
    toast.success("Relatório copiado");
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Archive className="h-6 w-6 text-primary" />
          Relatórios arquivados
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Histórico de relatórios finalizados e arquivados.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : reports.length === 0 ? (
        <Card className="p-12 text-center">
          <Archive className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum relatório arquivado.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
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
                      {formatReport(r)}
                    </pre>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button size="sm" variant="secondary" onClick={() => copyReport(r)}>
                        <Copy className="h-4 w-4 mr-2" />Copiar
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => unarchive(r.id)}>
                        Desarquivar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="text-destructive hover:text-destructive">
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
    </div>
  );
}

function formatReport(r: ViaturaReport): string {
  const sep = "———————————————————————";
  const colab = r.colaboradores && r.colaboradores.length > 0
    ? `\n👥 Colaboradores: ${r.colaboradores.join(", ")}`
    : "";
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
    colab,
    sep,
  ].join("\n");
}
