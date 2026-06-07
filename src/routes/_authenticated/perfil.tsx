import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Upload, UserCircle2, ImageIcon, Eye } from "lucide-react";
import { isOnline } from "@/hooks/use-presence";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: PerfilPage,
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
  last_seen: string | null;
};

async function signedUrl(bucket: string, path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

function PerfilPage() {
  const [userId, setUserId] = useState<string | undefined>();
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [bannerSrc, setBannerSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [others, setOthers] = useState<Profile[]>([]);
  const [otherAvatars, setOtherAvatars] = useState<Record<string, string | null>>({});
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const u = userData.user;
    if (!u) return;
    setUserId(u.id);
    setEmail(u.email ?? "");

    const { data } = await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
    let p = data as Profile | null;
    if (!p) {
      const { data: inserted } = await supabase
        .from("profiles")
        .insert({ id: u.id })
        .select()
        .single();
      p = inserted as Profile;
    }
    setProfile(p);
    setAvatarSrc(await signedUrl("avatars", p?.avatar_url ?? null));
    setBannerSrc(await signedUrl("banners", p?.banner_url ?? null));

    const { data: rest } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", u.id)
      .order("last_seen", { ascending: false });
    const list = (rest ?? []) as Profile[];
    setOthers(list);
    const urls: Record<string, string | null> = {};
    for (const o of list) urls[o.id] = await signedUrl("avatars", o.avatar_url);
    setOtherAvatars(urls);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const save = async () => {
    if (!userId || !profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        rg_cidade: profile.rg_cidade,
        patente: profile.patente,
        nome_cidade: profile.nome_cidade,
        bio: profile.bio,
        accent_color: profile.accent_color,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Perfil salvo");
  };

  const uploadFile = async (
    file: File,
    bucket: "avatars" | "banners",
    field: "avatar_url" | "banner_url",
  ) => {
    if (!userId) return;
    const setUploading = bucket === "avatars" ? setUploadingAvatar : setUploadingBanner;
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${userId}/${bucket === "avatars" ? "avatar" : "banner"}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    const oldPath = bucket === "avatars" ? profile?.avatar_url : profile?.banner_url;
    if (oldPath) await supabase.storage.from(bucket).remove([oldPath]);
    const { error } = await supabase
      .from("profiles")
      .update(field === "avatar_url" ? { avatar_url: path } : { banner_url: path })
      .eq("id", userId);
    if (error) toast.error(error.message);
    else {
      setProfile((p) => (p ? { ...p, [field]: path } : p));
      const url = await signedUrl(bucket, path);
      if (bucket === "avatars") setAvatarSrc(url);
      else setBannerSrc(url);
      toast.success(bucket === "avatars" ? "Foto atualizada" : "Banner atualizado");
    }
    setUploading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const accent = profile?.accent_color || "#e11d2a";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UserCircle2 className="h-6 w-6 text-primary" /> Meu Perfil
          </h1>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
        {userId && (
          <Button asChild variant="outline" size="sm">
            <Link to="/perfil/$id" params={{ id: userId }}>
              <Eye className="h-4 w-4 mr-2" /> Ver como público
            </Link>
          </Button>
        )}
      </div>

      {/* Preview Discord-style */}
      <Card className="overflow-hidden">
        <div
          className="h-32 w-full bg-cover bg-center relative"
          style={{
            backgroundImage: bannerSrc ? `url(${bannerSrc})` : undefined,
            backgroundColor: accent,
          }}
        >
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-2 right-2"
            onClick={() => bannerRef.current?.click()}
            disabled={uploadingBanner}
          >
            {uploadingBanner ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
            )}
            Alterar banner
          </Button>
          <input
            ref={bannerRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f, "banners", "banner_url");
              e.target.value = "";
            }}
          />
        </div>
        <CardContent className="pt-0 -mt-12 pb-6">
          <div className="flex items-end gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-card ring-2 ring-border">
                <AvatarImage src={avatarSrc ?? undefined} />
                <AvatarFallback className="text-2xl">
                  {(profile?.nome_cidade || email)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => avatarRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 shadow hover:scale-110 transition disabled:opacity-50"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={avatarRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadFile(f, "avatars", "avatar_url");
                  e.target.value = "";
                }}
              />
            </div>
            <div className="pb-2">
              <div className="text-lg font-bold">
                {profile?.patente ? `${profile.patente} ` : ""}
                {profile?.nome_cidade || "Sem nome"}
              </div>
              <div className="text-xs text-muted-foreground">
                {profile?.rg_cidade ? `RG ${profile.rg_cidade}` : "RG não definido"}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Aceita imagens estáticas e <strong>GIFs animados</strong> (PNG, JPG, WEBP, GIF).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Policial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome na cidade</Label>
              <Input
                value={profile?.nome_cidade ?? ""}
                onChange={(e) =>
                  setProfile((p) => (p ? { ...p, nome_cidade: e.target.value } : p))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>RG na cidade</Label>
              <Input
                value={profile?.rg_cidade ?? ""}
                onChange={(e) =>
                  setProfile((p) => (p ? { ...p, rg_cidade: e.target.value } : p))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Patente da PM</Label>
              <Input
                value={profile?.patente ?? ""}
                onChange={(e) =>
                  setProfile((p) => (p ? { ...p, patente: e.target.value } : p))
                }
                placeholder="Soldado, Cabo, Sargento, Tenente, Capitão..."
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Sobre mim</Label>
              <Textarea
                rows={3}
                value={profile?.bio ?? ""}
                onChange={(e) => setProfile((p) => (p ? { ...p, bio: e.target.value } : p))}
                placeholder="Conte um pouco sobre você..."
                maxLength={300}
              />
            </div>
            <div className="space-y-2">
              <Label>Cor de destaque (banner padrão)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={profile?.accent_color || "#e11d2a"}
                  onChange={(e) =>
                    setProfile((p) => (p ? { ...p, accent_color: e.target.value } : p))
                  }
                  className="h-10 w-16 rounded border border-border bg-transparent cursor-pointer"
                />
                <Input
                  value={profile?.accent_color ?? ""}
                  onChange={(e) =>
                    setProfile((p) => (p ? { ...p, accent_color: e.target.value } : p))
                  }
                  placeholder="#e11d2a"
                />
              </div>
            </div>
          </div>

          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar perfil
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
        </CardHeader>
        <CardContent>
          {others.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum outro usuário cadastrado.</p>
          ) : (
            <ul className="divide-y divide-border">
              {others.map((o) => {
                const online = isOnline(o.last_seen);
                return (
                  <li key={o.id}>
                    <Link
                      to="/perfil/$id"
                      params={{ id: o.id }}
                      className="flex items-center gap-3 py-3 hover:bg-secondary/40 -mx-2 px-2 rounded-md transition"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={otherAvatars[o.id] ?? undefined} />
                          <AvatarFallback>
                            {(o.nome_cidade || "?")[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                            online ? "bg-emerald-500" : "bg-muted-foreground/50"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {o.patente ? `${o.patente} ` : ""}
                          {o.nome_cidade || "Sem nome"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {o.rg_cidade ? `RG ${o.rg_cidade}` : "RG não definido"}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          online ? "text-emerald-500" : "text-muted-foreground"
                        }`}
                      >
                        {online ? "Online" : "Offline"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
