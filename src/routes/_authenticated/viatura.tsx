import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Car, Copy, FileText, Archive, Trash2, ChevronDown, ChevronUp,
  Banknote, Pill, Crosshair, Package,
} from "lucide-react";

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

const emptyForm = {
  horario_entrada: "",
  horario_saida: "",
  setor_batalhao: "",
  prefixo: "",
  placa: "",
  observacoes: "",
  num_prisoes: 0,
  dinheiro_sujo: 0,
  cocaina: 0,
  maconha: 0,
  metanfetamina: 0,
  five_seven: 0,
  ak47: 0,
  uzi: 0,
  pdw: 0,
  municao_380: 0,
  municao_762: 0,
  ticket_corrida: 0,
  lockpick: 0,
  diamantes: 0,
  c4: 0,
  motorista: "",
  chefe_barca: "",
  auxiliar: "",
  anotador: "",
};

export const Route = createFileRoute("/_authenticated/viatura")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Relatório de Viatura — PMESP" },
      { name: "description", content: "Painel completo de relatório de viatura: ocorrências e itens apreendidos." },
    ],
  }),
  component: ViaturaPage,
});

function ViaturaPage() {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [reports, setReports] = useState<ViaturaReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("viatura_reports")
      .select("*")
      .eq("status", "finalizado")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setReports((data as ViaturaReport[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from("viatura_reports").insert({
      ...form,
      user_id: userData.user.id,
      observacoes: form.observacoes || null,
      auxiliar: form.auxiliar || null,
      anotador: form.anotador || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Relatório de viatura registrado");
    setForm(emptyForm);
    load();
  }

  async function archive(id: string) {
    const { error } = await supabase.from("viatura_reports").update({ status: "arquivado" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Arquivado");
    setReports((rs) => rs.filter((r) => r.id !== id));
  }

  async function remove(id: string) {
    if (!confirm("Excluir definitivamente?")) return;
    const { error } = await supabase.from("viatura_reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    setReports((rs) => rs.filter((r) => r.id !== id));
  }

  function copyReport(r: ViaturaReport) {
    navigator.clipboard.writeText(formatReport(r));
    toast.success("Relatório copiado");
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Car className="h-6 w-6 text-primary" />
          Painel de Relatório — Viatura
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Preencha os campos. Você pode copiar o relatório formatado para o Discord depois.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={submit} className="space-y-8">
          <Section title="Turno">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="⏰ Horário de Entrada" value={form.horario_entrada} onChange={(v) => set("horario_entrada", v)} required placeholder="22:00" />
              <Field label="⏰ Horário de Saída" value={form.horario_saida} onChange={(v) => set("horario_saida", v)} required placeholder="02:00" />
            </div>
          </Section>

          <Section title="Unidade">
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="🗺️ Setor/Batalhão" value={form.setor_batalhao} onChange={(v) => set("setor_batalhao", v)} required />
              <Field label="📻 Prefixo" value={form.prefixo} onChange={(v) => set("prefixo", v)} required />
              <Field label="🚔 Placa da viatura" value={form.placa} onChange={(v) => set("placa", v)} required />
            </div>
          </Section>

          <Section title="Ocorrência">
            <div className="space-y-2">
              <Label htmlFor="obs">📌 Observações</Label>
              <Textarea id="obs" rows={4} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <NumField label="🔗 Nº de Prisões" value={form.num_prisoes} onChange={(v) => set("num_prisoes", v)} />
              <NumField label="💵 Dinheiro Sujo" value={form.dinheiro_sujo} onChange={(v) => set("dinheiro_sujo", v)} icon={<Banknote className="h-4 w-4" />} />
            </div>
          </Section>

          <Section title="Drogas" icon={<Pill className="h-4 w-4" />}>
            <div className="grid sm:grid-cols-3 gap-4">
              <NumField label="Cocaína" value={form.cocaina} onChange={(v) => set("cocaina", v)} />
              <NumField label="Maconha" value={form.maconha} onChange={(v) => set("maconha", v)} />
              <NumField label="Metanfetamina" value={form.metanfetamina} onChange={(v) => set("metanfetamina", v)} />
            </div>
          </Section>

          <Section title="Armas" icon={<Crosshair className="h-4 w-4" />}>
            <div className="grid sm:grid-cols-4 gap-4">
              <NumField label="Five Seven" value={form.five_seven} onChange={(v) => set("five_seven", v)} />
              <NumField label="AK-47" value={form.ak47} onChange={(v) => set("ak47", v)} />
              <NumField label="Uzi" value={form.uzi} onChange={(v) => set("uzi", v)} />
              <NumField label="PDW" value={form.pdw} onChange={(v) => set("pdw", v)} />
            </div>
          </Section>

          <Section title="Munição">
            <div className="grid sm:grid-cols-2 gap-4">
              <NumField label="Munição .380" value={form.municao_380} onChange={(v) => set("municao_380", v)} />
              <NumField label="Munição 7.62" value={form.municao_762} onChange={(v) => set("municao_762", v)} />
            </div>
          </Section>

          <Section title="Diversos" icon={<Package className="h-4 w-4" />}>
            <div className="grid sm:grid-cols-4 gap-4">
              <NumField label="Ticket corrida ilegal" value={form.ticket_corrida} onChange={(v) => set("ticket_corrida", v)} />
              <NumField label="Lockpick" value={form.lockpick} onChange={(v) => set("lockpick", v)} />
              <NumField label="Diamantes" value={form.diamantes} onChange={(v) => set("diamantes", v)} />
              <NumField label="C4" value={form.c4} onChange={(v) => set("c4", v)} />
            </div>
          </Section>

          <Section title="Equipe">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="👮 Motorista" value={form.motorista} onChange={(v) => set("motorista", v)} required />
              <Field label="👮 Chefe de Barca" value={form.chefe_barca} onChange={(v) => set("chefe_barca", v)} required />
              <Field label="👮 Auxiliar" value={form.auxiliar} onChange={(v) => set("auxiliar", v)} placeholder="—" />
              <Field label="👮 Anotador" value={form.anotador} onChange={(v) => set("anotador", v)} placeholder="—" />
            </div>
          </Section>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              <FileText className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Gerar relatório"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setForm(emptyForm)}>Limpar</Button>
          </div>
        </form>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Relatórios recentes
        </h2>
        {loading ? (
          <p className="text-muted-foreground text-sm">Carregando…</p>
        ) : reports.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">
            Nenhum relatório de viatura ainda.
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
                        <Badge className="text-[10px] uppercase">{r.num_prisoes} prisões</Badge>
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
                        <Button size="sm" variant="secondary" onClick={() => archive(r.id)}>
                          <Archive className="h-4 w-4 mr-2" />Arquivar
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
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground border-b border-border/60 pb-2">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({
  label, value, onChange, required, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} />
    </div>
  );
}

function NumField({
  label, value, onChange, icon,
}: { label: string; value: number; onChange: (v: number) => void; icon?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">{icon}{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

function formatReport(r: ViaturaReport): string {
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
