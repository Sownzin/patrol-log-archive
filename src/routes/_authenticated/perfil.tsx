import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Upload, UserCircle2 } from "lucide-react";
import { isOnline } from "@/hooks/use-presence";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: PerfilPage,
});

type Profile = {
  id: string;
  avatar_url: string | null;
  rg_cidade: string | null;
  patente: string | null;
  nome_cidade: string | null;
  last_seen: string | null;
};

async function signedUrl(path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

function PerfilPage() {
  const [userId, setUserId] = useState<string | undefined>();
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [others, setOthers] = useState<Profile[]>([]);
  const [otherAvatars, setOtherAvatars] = useState<Record<string, string | null>>({});
  const fileRef = useRef<HTMLInputElement>(null);

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
    setAvatarSrc(await signedUrl(p?.avatar_url ?? null));

    const { data: rest } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", u.id)
      .order("last_seen", { ascending: false });
    const list = (rest ?? []) as Profile[];
    setOthers(list);
    const urls: Record<string, string | null> = {};
    for (const o of list) urls[o.id] = await signedUrl(o.avatar_url);
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
      })
      .eq("id", userId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Perfil salvo");
  };

  const uploadAvatar = async (file: File) => {
    if (!userId) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    if (profile?.avatar_url) {
      await supabase.storage.from("avatars").remove([profile.avatar_url]);
    }
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", userId);
    if (error) toast.error(error.message);
    else {
      setProfile((p) => (p ? { ...p, avatar_url: path } : p));
      setAvatarSrc(await signedUrl(path));
      toast.success("Foto atualizada");
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <UserCircle2 className="h-6 w-6 text-primary" /> Meu Perfil
        </h1>
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Policial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarSrc ?? undefined} />
              <AvatarFallback>{(profile?.nome_cidade || email)[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Alterar foto
              </Button>
            </div>
          </div>

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
                  <li key={o.id} className="flex items-center gap-3 py-3">
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
