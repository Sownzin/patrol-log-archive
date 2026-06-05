import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Radio, Clock, MapPin, Users, Car, FileText, CheckCircle2, Archive } from "lucide-react";

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

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Patrulha Ativa — PMESP" },
      { name: "description", content: "Gere e acompanhe seu relatório de patrulha em tempo real." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const [active, setActive] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState("");

  const [form, setForm] = useState({
    rg: "",
    nome_guerra: "",
    graduacao: "",
    viatura: "",
    equipe: "",
    km_inicial: "",
    ocorrencias: "",
  });
  const [finalForm, setFinalForm] = useState({ km_final: "", ocorrencias: "" });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("patrol_reports")
      .select("*")
      .eq("status", "patrulhando")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) toast.error(error.message);
    setActive(data as Report | null);
    if (data) {
      setFinalForm({ km_final: "", ocorrencias: data.ocorrencias ?? "" });
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const ms = Date.now() - new Date(active.inicio).getTime();
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
    if (!userData.user) return;
    const { error } = await supabase.from("patrol_reports").insert({
      user_id: userData.user.id,
      rg: form.rg,
      nome_guerra: form.nome_guerra,
      graduacao: form.graduacao,
      viatura: form.viatura,
      equipe: form.equipe,
      km_inicial: Number(form.km_inicial),
      ocorrencias: form.ocorrencias || null,
      status: "patrulhando",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Patrulha iniciada");
    setForm({ rg: "", nome_guerra: "", graduacao: "", viatura: "", equipe: "", km_inicial: "", ocorrencias: "" });
    load();
  }

  async function finalize() {
    if (!active) return;
    if (!finalForm.km_final) return toast.error("Informe o KM final");
    setSaving(true);
    const { error } = await supabase
      .from("patrol_reports")
      .update({
        fim: new Date().toISOString(),
        km_final: Number(finalForm.km_final),
        ocorrencias: finalForm.ocorrencias || null,
        status: "finalizado",
      })
      .eq("id", active.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Patrulha finalizada");
    load();
  }

  async function archive() {
    if (!active) return;
    setSaving(true);
    const { error } = await supabase
      .from("patrol_reports")
      .update({ status: "arquivado" })
      .eq("id", active.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Relatório arquivado");
    load();
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto p-8 text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
      {active ? (
        <>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">EM PATRULHAMENTO</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Status ativo</p>
            </div>
          </div>

          <Card className="p-6 border-primary/40 bg-gradient-to-br from-card to-card/60">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <Stat icon={<Clock />} label="Decorrido" value={elapsed || "—"} highlight />
              <Stat icon={<Users />} label="Equipe" value={active.equipe} />
              <Stat icon={<Car />} label="Viatura" value={active.viatura} />
              <Stat icon={<MapPin />} label="KM inicial" value={String(active.km_inicial)} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm border-t border-border/60 pt-4">
              <Info label="RG" value={active.rg} />
              <Info label="Nome de guerra" value={active.nome_guerra} />
              <Info label="Graduação" value={active.graduacao} />
              <Info
                label="Início"
                value={new Date(active.inicio).toLocaleString("pt-BR")}
              />
            </div>
          </Card>

          {active.status === "patrulhando" ? (
            <Card className="p-6 space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Finalizar patrulha
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="km_final">KM final</Label>
                  <Input
                    id="km_final"
                    type="number"
                    value={finalForm.km_final}
                    onChange={(e) => setFinalForm({ ...finalForm, km_final: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ocorrencias">Ocorrências</Label>
                <Textarea
                  id="ocorrencias"
                  rows={4}
                  value={finalForm.ocorrencias}
                  onChange={(e) => setFinalForm({ ...finalForm, ocorrencias: e.target.value })}
                  placeholder="Descreva as ocorrências do turno..."
                />
              </div>
              <Button onClick={finalize} disabled={saving} className="w-full sm:w-auto">
                {saving ? "Salvando..." : "Finalizar patrulha"}
              </Button>
            </Card>
          ) : (
            <Card className="p-6 space-y-4">
              <h2 className="font-semibold">Patrulha finalizada</h2>
              <p className="text-sm text-muted-foreground">
                Arquive para liberar e iniciar uma nova patrulha.
              </p>
              <Button onClick={archive} disabled={saving} variant="secondary">
                <Archive className="h-4 w-4 mr-2" />
                Arquivar relatório
              </Button>
            </Card>
          )}
        </>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Radio className="h-6 w-6 text-primary" />
              Nova patrulha
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Preencha os dados para iniciar o relatório e marcar status como "patrulhando".
            </p>
          </div>

          <Card className="p-6">
            <form onSubmit={startPatrol} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="RG" id="rg" value={form.rg} onChange={(v) => setForm({ ...form, rg: v })} required />
                <Field label="Nome de guerra" id="nome_guerra" value={form.nome_guerra} onChange={(v) => setForm({ ...form, nome_guerra: v })} required />
                <Field label="Graduação" id="graduacao" value={form.graduacao} onChange={(v) => setForm({ ...form, graduacao: v })} required placeholder="Sd, Cb, Sgt..." />
                <Field label="Viatura" id="viatura" value={form.viatura} onChange={(v) => setForm({ ...form, viatura: v })} required />
                <Field label="Equipe" id="equipe" value={form.equipe} onChange={(v) => setForm({ ...form, equipe: v })} required />
                <Field label="KM inicial" id="km_inicial" type="number" value={form.km_inicial} onChange={(v) => setForm({ ...form, km_inicial: v })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ocorrencias">Observações iniciais (opcional)</Label>
                <Textarea
                  id="ocorrencias"
                  rows={3}
                  value={form.ocorrencias}
                  onChange={(e) => setForm({ ...form, ocorrencias: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                <FileText className="h-4 w-4 mr-2" />
                {saving ? "Iniciando..." : "Iniciar patrulha"}
              </Button>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        <span className="[&_svg]:h-3 [&_svg]:w-3">{icon}</span>
        {label}
      </div>
      <div className={highlight ? "text-2xl font-bold text-primary tabular-nums" : "text-base font-semibold"}>
        {value}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Field({
  label, id, value, onChange, type = "text", required, placeholder,
}: {
  label: string; id: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} />
    </div>
  );
}
