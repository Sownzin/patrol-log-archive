import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { PmespLogo } from "@/components/pmesp-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acesso — PMESP Relatórios" },
      { name: "description", content: "Entre para gerar e arquivar relatórios de patrulha." },
    ],
  }),
  component: AuthPage,
});

const PATENTES = [
  "Soldado",
  "Cabo",
  "3º Sargento",
  "2º Sargento",
  "1º Sargento",
  "Subtenente",
  "Aspirante",
  "2º Tenente",
  "1º Tenente",
  "Capitão",
  "Major",
  "Tenente-Coronel",
  "Coronel",
];

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [rg, setRg] = useState("");
  const [patente, setPatente] = useState("");
  const [setor, setSetor] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  function onPick(f: File) {
    setAvatar(f);
    const r = new FileReader();
    r.onload = () => setAvatarPreview(r.result as string);
    r.readAsDataURL(f);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        const userId = data.session?.user.id ?? data.user?.id;

        if (userId) {
          let avatarPath: string | null = null;
          if (avatar) {
            const ext = avatar.name.split(".").pop() || "png";
            const path = `${userId}/avatar-${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("avatars")
              .upload(path, avatar, { upsert: true, contentType: avatar.type });
            if (!upErr) avatarPath = path;
          }
          await supabase.from("profiles").upsert({
            id: userId,
            nome_cidade: nome || null,
            rg_cidade: rg || null,
            patente: patente || null,
            setor: setor || null,
            avatar_url: avatarPath,
          });
        }

        if (data.session) {
          toast.success("Cadastro realizado com sucesso!");
          navigate({ to: "/", replace: true });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.78_0.14_85/0.08),transparent_60%)] pointer-events-none" />
      <Card className="relative w-full max-w-md p-8 border-border/60">
        <div className="flex flex-col items-center mb-6">
          <PmespLogo className="h-16 w-16 mb-4" />
          <h1 className="text-2xl font-bold tracking-tight">PMESP Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignup ? "Criar nova conta" : "Acesso ao sistema de patrulha"}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {isSignup && (
            <>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarPreview ?? undefined} />
                  <AvatarFallback>{(nome || email)[0]?.toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onPick(f);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" /> Foto de perfil
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label>Nome na cidade</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>RG</Label>
                  <Input value={rg} onChange={(e) => setRg(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Setor</Label>
                  <Input value={setor} onChange={(e) => setSetor(e.target.value)} required />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Patente</Label>
                  <select
                    value={patente}
                    onChange={(e) => setPatente(e.target.value)}
                    required
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {PATENTES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">E-mail ou usuário</Label>
            <Input
              id="email"
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSignup ? "Cadastrar" : "Entrar"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {isSignup ? "Já tem conta? " : "Não tem conta? "}
          <button
            type="button"
            onClick={() => setMode(isSignup ? "signin" : "signup")}
            className="text-primary hover:underline font-medium"
          >
            {isSignup ? "Entrar" : "Cadastre-se"}
          </button>
        </div>
        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            ← voltar
          </Link>
        </div>
      </Card>
    </div>
  );
}
