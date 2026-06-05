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
  Radio, Clock, Car, FileText, CheckCircle2, Archive, Copy,
  Banknote, Pill, Crosshair, Package, Users, UserPlus,
} from "lucide-react";

type ViaturaReport = {
  id: string;
  user_id: string;
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

export const Route = createFileRoute("/_authenticated/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Patrulha — PMESP" },
      { name: "description", content: "Inicie a patrulha de viatura, acompanhe o tempo e finalize com o relatório completo." },
    ],
  }),
  component: PatrolPage,
});

function fmtTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function usernameFromEmail(email: string | null | undefined) {
  if (!email) return "usuário";
  return email.split("@")[0];
}

function PatrolPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [nomeCidade, setNomeCidade] = useState<string>("");
  const [openPatrols, setOpenPatrols] = useState<ViaturaReport[]>([]);
  const [active, setActive] = useState<ViaturaReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState("");

  const [startForm, setStartForm] = useState({
    setor_batalhao: "",
    prefixo: "",
    placa: "",
    motorista: "",
    chefe_barca: "",
    auxiliar: "",
    anotador: "",
  });

  const [endForm, setEndForm] = useState({
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
  });

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;

    let nc = "";
    if (uid) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("nome_cidade")
        .eq("id", uid)
        .maybeSingle();
      nc = prof?.nome_cidade ?? "";
    }
    if (!nc) nc = usernameFromEmail(userData.user?.email);
    setUserId(uid);
    setNomeCidade(nc);

    // Load all open patrols (visible to any authenticated user via RLS)
    const { data: open } = await supabase
      .from("viatura_reports")
      .select("*")
      .eq("status", "patrulhando")
      .order("created_at", { ascending: false });
    const opens = (open as ViaturaReport[]) ?? [];
    setOpenPatrols(opens);

    // Find patrol the user is in (owner or collaborator)
    const mine = opens.find(
      (p) => p.user_id === uid || (p.colaboradores ?? []).includes(nc),
    );

    if (mine) {
      setActive(mine);
    } else {
      // Check if user has a finalized but not archived report to show
      const { data: finalized } = await supabase
        .from("viatura_reports")
        .select("*")
        .eq("status", "finalizado")
        .eq("user_id", uid ?? "")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setActive((finalized as ViaturaReport) ?? null);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!active || active.status !== "patrulhando") {
      setElapsed("");
      return;
    }
    const tick = () => {
      const ms = Date.now() - new Date(active.created_at).getTime();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setElapsed(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active]);

  async function startPatrol(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setSaving(false); return; }
    const { error } = await supabase.from("viatura_reports").insert({
      user_id: userData.user.id,
      status: "patrulhando",
      horario_entrada: fmtTime(new Date()),
      horario_saida: "",
      setor_batalhao: startForm.setor_batalhao,
      prefixo: startForm.prefixo,
      placa: startForm.placa,
      motorista: startForm.motorista,
      chefe_barca: startForm.chefe_barca,
      auxiliar: startForm.auxiliar || null,
      anotador: startForm.anotador || null,
      colaboradores: [nomeCidade || usernameFromEmail(userData.user.email)],
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Patrulha iniciada — tempo correndo");
    setStartForm({ setor_batalhao: "", prefixo: "", placa: "", motorista: "", chefe_barca: "", auxiliar: "", anotador: "" });
    load();
  }

  async function joinPatrol(p: ViaturaReport) {
    const current = p.colaboradores ?? [];
    if (current.includes(username)) {
      setActive(p);
      return;
    }
    const next = [...current, username];
    const { error } = await supabase
      .from("viatura_reports")
      .update({ colaboradores: next })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(`Conectado como ${username}`);
    load();
  }

  async function finalize() {
    if (!active) return;
    setSaving(true);
    const { error } = await supabase
      .from("viatura_reports")
      .update({
        ...endForm,
        observacoes: endForm.observacoes || null,
        horario_saida: fmtTime(new Date()),
        status: "finalizado",
      })
      .eq("id", active.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Patrulha finalizada");
    setActive((prev) => prev ? {
      ...prev,
      ...endForm,
      observacoes: endForm.observacoes || null,
      horario_saida: fmtTime(new Date()),
      status: "finalizado",
    } : prev);
  }

  async function archive() {
    if (!active) return;
    if (active.user_id !== userId) {
      toast.error("Apenas o criador da patrulha pode arquivar");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("viatura_reports")
      .update({ status: "arquivado" })
      .eq("id", active.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Relatório arquivado");
    setActive(null);
    setEndForm({
      observacoes: "", num_prisoes: 0, dinheiro_sujo: 0,
      cocaina: 0, maconha: 0, metanfetamina: 0,
      five_seven: 0, ak47: 0, uzi: 0, pdw: 0,
      municao_380: 0, municao_762: 0,
      ticket_corrida: 0, lockpick: 0, diamantes: 0, c4: 0,
    });
    load();
  }

  function copyReport() {
    if (!active) return;
    navigator.clipboard.writeText(formatReport(active));
    toast.success("Relatório copiado");
  }

  const setEnd = <K extends keyof typeof endForm>(k: K, v: (typeof endForm)[K]) =>
    setEndForm((f) => ({ ...f, [k]: v }));

  if (loading) {
    return <div className="max-w-4xl mx-auto p-8 text-muted-foreground">Carregando…</div>;
  }

  // ============ NO ACTIVE PATROL: list open patrols + start form ============
  if (!active) {
    const others = openPatrols.filter((p) => p.user_id !== userId);
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Radio className="h-6 w-6 text-primary" />
            Patrulha
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inicie uma nova patrulha ou conecte-se a uma em andamento.
          </p>
        </div>

        {others.length > 0 && (
          <Card className="p-6 border-primary/40">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-primary" />
              Patrulhas em aberto ({others.length})
            </h2>
            <div className="space-y-3">
              {others.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-secondary/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">VTR {p.placa} · {p.prefixo}</span>
                      <Badge variant="secondary" className="text-[10px]">{p.setor_batalhao}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      Motorista: {p.motorista} · Chefe: {p.chefe_barca}
                      {(p.colaboradores?.length ?? 0) > 0 && (
                        <> · 👥 {p.colaboradores!.join(", ")}</>
                      )}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => joinPatrol(p)}>
                    <UserPlus className="h-4 w-4 mr-1" />Conectar
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <form onSubmit={startPatrol} className="space-y-6">
            <h2 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Iniciar nova patrulha
            </h2>

            <Section title="Unidade">
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="🗺️ Setor/Batalhão" value={startForm.setor_batalhao} onChange={(v) => setStartForm({ ...startForm, setor_batalhao: v })} required />
                <Field label="📻 Prefixo" value={startForm.prefixo} onChange={(v) => setStartForm({ ...startForm, prefixo: v })} required />
                <Field label="🚔 Placa da viatura" value={startForm.placa} onChange={(v) => setStartForm({ ...startForm, placa: v })} required />
              </div>
            </Section>

            <Section title="Equipe" icon={<Users className="h-4 w-4" />}>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="👮 Motorista" value={startForm.motorista} onChange={(v) => setStartForm({ ...startForm, motorista: v })} required />
                <Field label="👮 Chefe de Barca" value={startForm.chefe_barca} onChange={(v) => setStartForm({ ...startForm, chefe_barca: v })} required />
                <Field label="👮 Auxiliar" value={startForm.auxiliar} onChange={(v) => setStartForm({ ...startForm, auxiliar: v })} placeholder="—" />
                <Field label="👮 Anotador" value={startForm.anotador} onChange={(v) => setStartForm({ ...startForm, anotador: v })} placeholder="—" />
              </div>
            </Section>

            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              <FileText className="h-4 w-4 mr-2" />
              {saving ? "Iniciando..." : "Iniciar patrulha"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // ============ ACTIVE PATROL ============
  const isFinalized = active.status === "finalizado";
  const isOwner = active.user_id === userId;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
      <div className="flex items-center gap-3">
        {!isFinalized && (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {isFinalized ? "PATRULHA FINALIZADA" : "EM PATRULHAMENTO"}
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            {isFinalized ? "Pronto para arquivar" : isOwner ? "Cronômetro ativo · você é o criador" : `Conectado como ${username}`}
          </p>
        </div>
      </div>

      <Card className="p-6 border-primary/40 bg-gradient-to-br from-card to-card/60">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Stat icon={<Clock />} label={isFinalized ? "Duração" : "Decorrido"} value={elapsed || "—"} highlight />
          <Stat icon={<Car />} label="Viatura" value={active.placa} />
          <Stat icon={<Radio />} label="Prefixo" value={active.prefixo} />
          <Stat icon={<FileText />} label="Setor" value={active.setor_batalhao} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm border-t border-border/60 pt-4">
          <Info label="Entrada" value={active.horario_entrada} />
          <Info label="Saída" value={active.horario_saida || "—"} />
          <Info label="Motorista" value={active.motorista} />
          <Info label="Chefe de Barca" value={active.chefe_barca} />
          <Info label="Auxiliar" value={active.auxiliar ?? "—"} />
          <Info label="Anotador" value={active.anotador ?? "—"} />
        </div>
        {(active.colaboradores?.length ?? 0) > 0 && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
              <Users className="h-3 w-3" />Colaboradores conectados
            </div>
            <div className="flex flex-wrap gap-2">
              {active.colaboradores!.map((c) => (
                <Badge key={c} variant={c === username ? "default" : "secondary"} className="text-xs">{c}</Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      {!isFinalized ? (
        <Card className="p-6 space-y-6">
          <h2 className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Finalizar e preencher relatório
          </h2>

          <Section title="Ocorrência">
            <div className="space-y-2">
              <Label>📌 Observações</Label>
              <Textarea rows={4} value={endForm.observacoes} onChange={(e) => setEnd("observacoes", e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <NumField label="🔗 Nº de Prisões" value={endForm.num_prisoes} onChange={(v) => setEnd("num_prisoes", v)} />
              <NumField label="Dinheiro Sujo" icon={<Banknote className="h-4 w-4" />} value={endForm.dinheiro_sujo} onChange={(v) => setEnd("dinheiro_sujo", v)} />
            </div>
          </Section>

          <Section title="Drogas" icon={<Pill className="h-4 w-4" />}>
            <div className="grid sm:grid-cols-3 gap-4">
              <NumField label="Cocaína" value={endForm.cocaina} onChange={(v) => setEnd("cocaina", v)} />
              <NumField label="Maconha" value={endForm.maconha} onChange={(v) => setEnd("maconha", v)} />
              <NumField label="Metanfetamina" value={endForm.metanfetamina} onChange={(v) => setEnd("metanfetamina", v)} />
            </div>
          </Section>

          <Section title="Armas" icon={<Crosshair className="h-4 w-4" />}>
            <div className="grid sm:grid-cols-4 gap-4">
              <NumField label="Five Seven" value={endForm.five_seven} onChange={(v) => setEnd("five_seven", v)} />
              <NumField label="AK-47" value={endForm.ak47} onChange={(v) => setEnd("ak47", v)} />
              <NumField label="Uzi" value={endForm.uzi} onChange={(v) => setEnd("uzi", v)} />
              <NumField label="PDW" value={endForm.pdw} onChange={(v) => setEnd("pdw", v)} />
            </div>
          </Section>

          <Section title="Munição">
            <div className="grid sm:grid-cols-2 gap-4">
              <NumField label="Munição .380" value={endForm.municao_380} onChange={(v) => setEnd("municao_380", v)} />
              <NumField label="Munição 7.62" value={endForm.municao_762} onChange={(v) => setEnd("municao_762", v)} />
            </div>
          </Section>

          <Section title="Diversos" icon={<Package className="h-4 w-4" />}>
            <div className="grid sm:grid-cols-4 gap-4">
              <NumField label="Ticket corrida" value={endForm.ticket_corrida} onChange={(v) => setEnd("ticket_corrida", v)} />
              <NumField label="Lockpick" value={endForm.lockpick} onChange={(v) => setEnd("lockpick", v)} />
              <NumField label="Diamantes" value={endForm.diamantes} onChange={(v) => setEnd("diamantes", v)} />
              <NumField label="C4" value={endForm.c4} onChange={(v) => setEnd("c4", v)} />
            </div>
          </Section>

          <Button onClick={finalize} disabled={saving} className="w-full sm:w-auto">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Finalizar patrulha"}
          </Button>
        </Card>
      ) : (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold">Relatório pronto</h2>
          <pre className="text-xs whitespace-pre-wrap font-mono bg-secondary/40 p-3 rounded border border-border/60 max-h-96 overflow-auto">
            {formatReport(active)}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button onClick={copyReport} variant="secondary">
              <Copy className="h-4 w-4 mr-2" />Copiar para Discord
            </Button>
            {isOwner && (
              <Button onClick={archive} disabled={saving}>
                <Archive className="h-4 w-4 mr-2" />Arquivar relatório
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground border-b border-border/60 pb-2">
        {icon}{title}
      </div>
      {children}
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        <span className="[&_svg]:h-3 [&_svg]:w-3">{icon}</span>{label}
      </div>
      <div className={highlight ? "text-2xl font-bold text-primary tabular-nums" : "text-base font-semibold truncate"}>
        {value}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-medium truncate">{value}</div>
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
      <Input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
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
