import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Users } from "lucide-react";
import { isOnline } from "@/hooks/use-presence";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
});

const PATENTE_ORDEM = [
  "Coronel",
  "Tenente-Coronel",
  "Major",
  "Capitão",
  "1º Tenente",
  "2º Tenente",
  "Aspirante",
  "Subtenente",
  "1º Sargento",
  "2º Sargento",
  "3º Sargento",
  "Cabo",
  "Soldado",
];

type Profile = {
  id: string;
  avatar_url: string | null;
  rg_cidade: string | null;
  patente: string | null;
  nome_cidade: string | null;
  setor: string | null;
  last_seen: string | null;
};

type Cargo = { id: string; nome: string; cor: string; ordem: number };

async function signedUrl(path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

function UsuariosPage() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [userCargos, setUserCargos] = useState<Record<string, string[]>>({});
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});

  const load = async () => {
    const [{ data: p }, { data: c }, { data: uc }] = await Promise.all([
      supabase.from("profiles").select("*").order("nome_cidade", { ascending: true }),
      supabase.from("cargos").select("*").order("ordem", { ascending: false }),
      supabase.from("user_cargos").select("user_id, cargo_id"),
    ]);
    const list = (p ?? []) as Profile[];
    setProfiles(list);
    setCargos((c ?? []) as Cargo[]);
    const map: Record<string, string[]> = {};
    for (const row of (uc ?? []) as { user_id: string; cargo_id: string }[]) {
      (map[row.user_id] ||= []).push(row.cargo_id);
    }
    setUserCargos(map);
    const urls: Record<string, string | null> = {};
    for (const u of list) urls[u.id] = await signedUrl(u.avatar_url);
    setAvatars(urls);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const grouped = new Map<string, Profile[]>();
  for (const p of profiles) {
    const k = p.patente || "Sem patente";
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(p);
  }
  const ordered = [...grouped.entries()].sort((a, b) => {
    const ia = PATENTE_ORDEM.indexOf(a[0]);
    const ib = PATENTE_ORDEM.indexOf(b[0]);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  const onlineCount = profiles.filter((p) => isOnline(p.last_seen)).length;
  const cargoById = new Map(cargos.map((c) => [c.id, c]));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Usuários
        </h1>
        <p className="text-sm text-muted-foreground">
          {profiles.length} membros · <span className="text-emerald-500">{onlineCount} online</span>
        </p>
      </div>

      <div className="space-y-4">
        {ordered.map(([patente, members]) => (
          <Card key={patente}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                {patente} — {members.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border/60">
                {members
                  .slice()
                  .sort(
                    (a, b) =>
                      Number(isOnline(b.last_seen)) - Number(isOnline(a.last_seen)) ||
                      (a.nome_cidade || "").localeCompare(b.nome_cidade || ""),
                  )
                  .map((m) => {
                    const online = isOnline(m.last_seen);
                    const userCargoIds = userCargos[m.id] ?? [];
                    return (
                      <li key={m.id} className="flex items-center gap-3 py-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={avatars[m.id] ?? undefined} />
                            <AvatarFallback>
                              {(m.nome_cidade || "?")[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                              online ? "bg-emerald-500" : "bg-muted-foreground/50"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate flex items-center gap-2 flex-wrap">
                            {m.nome_cidade || "Sem nome"}
                            {userCargoIds.map((cid) => {
                              const c = cargoById.get(cid);
                              if (!c) return null;
                              return (
                                <span
                                  key={cid}
                                  className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                                  style={{
                                    color: c.cor,
                                    backgroundColor: `${c.cor}22`,
                                    border: `1px solid ${c.cor}55`,
                                  }}
                                >
                                  {c.nome}
                                </span>
                              );
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {m.rg_cidade ? `RG ${m.rg_cidade}` : "Sem RG"}
                            {m.setor ? ` · ${m.setor}` : ""}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            online ? "text-emerald-500" : "text-muted-foreground"
                          }`}
                        >
                          {online ? "Online" : "Offline"}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
