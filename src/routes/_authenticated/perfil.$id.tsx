import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, BadgeCheck, Clock } from "lucide-react";
import { PmespLogo } from "@/components/pmesp-logo";
import { isOnline } from "@/hooks/use-presence";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/perfil/$id")({
  component: PerfilPublicoPage,
  errorComponent: ({ error }) => (
    <div className="max-w-md mx-auto py-20 text-center">
      <p className="text-sm text-destructive">{error.message}</p>
      <Button asChild variant="outline" size="sm" className="mt-4">
        <Link to="/usuarios">Voltar</Link>
      </Button>
    </div>
  ),
  notFoundComponent: () => (
    <div className="max-w-md mx-auto py-20 text-center">
      <p className="text-sm text-muted-foreground">Usuário não encontrado.</p>
      <Button asChild variant="outline" size="sm" className="mt-4">
        <Link to="/usuarios">Voltar</Link>
      </Button>
    </div>
  ),
});

type Profile = {
  id: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  accent_color: string | null;
  rg_cidade: string | null;
  patente: string | null;
  nome_cidade: string | null;
  setor: string | null;
  last_seen: string | null;
  created_at: string | null;
};

type Cargo = { id: string; nome: string; cor: string; ordem: number };

async function signedUrl(bucket: string, path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

function PerfilPublicoPage() {
  const { id } = useParams({ from: "/_authenticated/perfil/$id" });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [patrolCount, setPatrolCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      if (!p) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const prof = p as Profile;
      setProfile(prof);
      setAvatarUrl(await signedUrl("avatars", prof.avatar_url));
      setBannerUrl(await signedUrl("banners", prof.banner_url));

      const [{ data: uc }, { data: allCargos }, { count }] = await Promise.all([
        supabase.from("user_cargos").select("cargo_id").eq("user_id", id),
        supabase.from("cargos").select("*"),
        supabase
          .from("patrol_reports")
          .select("*", { count: "exact", head: true })
          .eq("user_id", id),
      ]);
      if (cancelled) return;
      const ids = (uc ?? []).map((r: { cargo_id: string }) => r.cargo_id);
      const map = new Map((allCargos ?? []).map((c: Cargo) => [c.id, c]));
      setCargos(ids.map((cid) => map.get(cid)).filter(Boolean) as Cargo[]);
      setPatrolCount(count ?? 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <p className="text-sm text-muted-foreground">Usuário não encontrado.</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/usuarios">Voltar</Link>
        </Button>
      </div>
    );
  }

  const accent = profile.accent_color || "#e11d2a";
  const online = isOnline(profile.last_seen);
  const joined = profile.created_at
    ? formatDistanceToNow(new Date(profile.created_at), { addSuffix: true, locale: ptBR })
    : null;
  const lastSeenText =
    online || !profile.last_seen
      ? null
      : formatDistanceToNow(new Date(profile.last_seen), { addSuffix: true, locale: ptBR });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/usuarios">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Link>
      </Button>

      <Card className="overflow-hidden shadow-2xl">
        {/* Banner */}
        <div
          className="h-40 sm:h-48 w-full bg-cover bg-center"
          style={{
            backgroundImage: bannerUrl ? `url(${bannerUrl})` : undefined,
            backgroundColor: accent,
          }}
        />

        {/* Avatar + status */}
        <div className="px-6 -mt-14 relative">
          <div className="relative inline-block">
            <Avatar className="h-28 w-28 border-[6px] border-card shadow-xl">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback className="text-3xl">
                {(profile.nome_cidade || "?")[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span
              className={`absolute bottom-1 right-1 h-6 w-6 rounded-full border-[5px] border-card ${
                online ? "bg-emerald-500" : "bg-muted-foreground/60"
              }`}
              title={online ? "Online" : "Offline"}
            />
          </div>
        </div>

        {/* Info card (Discord-like inner panel) */}
        <div className="px-6 pb-6 pt-3">
          <div className="bg-background/60 rounded-lg p-5 space-y-4 border border-border/60">
            <div>
              <h2 className="text-2xl font-bold leading-tight">
                {profile.nome_cidade || "Sem nome"}
              </h2>
              <div className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
                {profile.patente && (
                  <span className="flex items-center gap-1">
                    <PmespLogo className="h-3.5 w-3.5" /> {profile.patente}
                  </span>
                )}
                {profile.rg_cidade && (
                  <>
                    <span>·</span>
                    <span>RG {profile.rg_cidade}</span>
                  </>
                )}
              </div>
            </div>

            {cargos.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">
                  Cargos
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cargos.map((c) => (
                    <span
                      key={c.id}
                      className="text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5"
                      style={{
                        color: c.cor,
                        backgroundColor: `${c.cor}22`,
                        border: `1px solid ${c.cor}55`,
                      }}
                    >
                      <BadgeCheck className="h-3 w-3" />
                      {c.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.bio && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                  Sobre mim
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{profile.bio}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  Patrulhas
                </div>
                <div className="text-sm font-semibold">{patrolCount}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  Status
                </div>
                <div
                  className={`text-sm font-semibold ${
                    online ? "text-emerald-500" : "text-muted-foreground"
                  }`}
                >
                  {online ? "Online agora" : lastSeenText ? `Visto ${lastSeenText}` : "Offline"}
                </div>
              </div>
              {joined && (
                <div className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                  <Clock className="h-3 w-3" /> Membro {joined}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
