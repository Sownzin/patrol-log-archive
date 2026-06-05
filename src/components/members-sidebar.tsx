import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isOnline } from "@/hooks/use-presence";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

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

export function MembersSidebar() {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [userCargos, setUserCargos] = useState<Record<string, string[]>>({});
  const [avatars, setAvatars] = useState<Record<string, string | null>>({});
  const [query, setQuery] = useState("");

  const load = async () => {
    const [{ data: p }, { data: c }, { data: uc }] = await Promise.all([
      supabase.from("profiles").select("*"),
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
    await Promise.all(
      list.map(async (u) => {
        urls[u.id] = await signedUrl(u.avatar_url);
      }),
    );
    setAvatars(urls);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const filtered = profiles.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (p.nome_cidade || "").toLowerCase().includes(q) ||
      (p.rg_cidade || "").toLowerCase().includes(q) ||
      (p.patente || "").toLowerCase().includes(q)
    );
  });

  const grouped = new Map<string, Profile[]>();
  for (const p of filtered) {
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
    <aside className="hidden lg:flex flex-col w-72 shrink-0 border-l border-border/60 bg-card/30 backdrop-blur h-[calc(100vh-4rem)] sticky top-16">
      <div className="px-3 py-3 border-b border-border/60 space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-between">
          <span>Membros — {profiles.length}</span>
          <span className="text-emerald-500">● {onlineCount} online</span>
        </div>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar membro..."
            className="h-8 pl-7 text-xs bg-background/60"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          ordered.map(([patente, members]) => (
            <div key={patente} className="mb-3">
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {patente} — {members.length}
              </div>
              <ul>
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
                    const firstCargo = userCargoIds
                      .map((id) => cargoById.get(id))
                      .filter(Boolean)[0] as Cargo | undefined;
                    return (
                      <li key={m.id}>
                        <Link
                          to="/perfil"
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/60 transition-colors ${
                            online ? "" : "opacity-50 hover:opacity-100"
                          }`}
                        >
                          <div className="relative shrink-0">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={avatars[m.id] ?? undefined} />
                              <AvatarFallback className="text-[10px]">
                                {(m.nome_cidade || "?")[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
                                online ? "bg-emerald-500" : "bg-muted-foreground/50"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-sm font-medium truncate leading-tight"
                              style={firstCargo ? { color: firstCargo.cor } : undefined}
                            >
                              {m.nome_cidade || "Sem nome"}
                            </div>
                            {firstCargo && (
                              <div
                                className="text-[10px] uppercase tracking-wider font-semibold truncate"
                                style={{ color: firstCargo.cor, opacity: 0.85 }}
                              >
                                {firstCargo.nome}
                              </div>
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
