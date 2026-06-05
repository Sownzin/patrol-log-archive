import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Shield, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cargos")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!data) throw redirect({ to: "/" });
  },
  component: CargosPage,
});

type Cargo = { id: string; nome: string; cor: string; ordem: number };
type Profile = { id: string; nome_cidade: string | null; patente: string | null };

function CargosPage() {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userCargos, setUserCargos] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#6366f1");
  const [ordem, setOrdem] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: c }, { data: p }, { data: uc }] = await Promise.all([
      supabase.from("cargos").select("*").order("ordem", { ascending: false }),
      supabase.from("profiles").select("id, nome_cidade, patente"),
      supabase.from("user_cargos").select("user_id, cargo_id"),
    ]);
    setCargos((c ?? []) as Cargo[]);
    setProfiles((p ?? []) as Profile[]);
    const map: Record<string, string[]> = {};
    for (const row of (uc ?? []) as { user_id: string; cargo_id: string }[]) {
      (map[row.user_id] ||= []).push(row.cargo_id);
    }
    setUserCargos(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createCargo = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("cargos").insert({ nome: nome.trim(), cor, ordem });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setNome("");
      setOrdem(0);
      toast.success("Cargo criado");
      load();
    }
  };

  const deleteCargo = async (id: string) => {
    if (!confirm("Excluir este cargo?")) return;
    const { error } = await supabase.from("cargos").delete().eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  const toggleAssign = async (userId: string, cargoId: string, has: boolean) => {
    if (has) {
      const { error } = await supabase
        .from("user_cargos")
        .delete()
        .eq("user_id", userId)
        .eq("cargo_id", cargoId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("user_cargos")
        .insert({ user_id: userId, cargo_id: cargoId });
      if (error) return toast.error(error.message);
    }
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Cargos
        </h1>
        <p className="text-sm text-muted-foreground">
          Crie cargos personalizados e atribua aos membros.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo cargo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-[1fr_120px_100px_auto] gap-3 items-end">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Comandante" />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <Input type="color" value={cor} onChange={(e) => setCor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={ordem}
                onChange={(e) => setOrdem(parseInt(e.target.value) || 0)}
              />
            </div>
            <Button onClick={createCargo} disabled={saving || !nome.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ml-2">Criar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cargos existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {cargos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cargo criado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {cargos.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-md border border-border/60"
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: c.cor }}
                  />
                  <span className="font-medium" style={{ color: c.cor }}>
                    {c.nome}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">ordem {c.ordem}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteCargo(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Atribuir cargos</CardTitle>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 || cargos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {cargos.length === 0 ? "Crie um cargo primeiro." : "Sem usuários."}
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {profiles.map((p) => (
                <li key={p.id} className="py-3">
                  <div className="text-sm font-medium">
                    {p.nome_cidade || "Sem nome"}{" "}
                    <span className="text-xs text-muted-foreground">
                      {p.patente ? `· ${p.patente}` : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {cargos.map((c) => {
                      const has = (userCargos[p.id] ?? []).includes(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleAssign(p.id, c.id, has)}
                          className="text-xs px-2 py-1 rounded border transition"
                          style={{
                            color: has ? "#fff" : c.cor,
                            backgroundColor: has ? c.cor : "transparent",
                            borderColor: c.cor,
                          }}
                        >
                          {c.nome}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
