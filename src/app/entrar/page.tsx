import { signIn } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createClient();
  if (supabase) {
    const { data } = await supabase.auth.getClaims();
    if (data?.claims.sub) redirect("/");
  }
  const { erro } = await searchParams;
  const errorMessage = erro === "configuracao"
    ? "A conexão segura ainda não foi configurada."
    : erro === "credenciais" ? "E-mail ou senha inválidos." : "";

  return <main className="login-screen">
    <section className="login-card">
      <Link href="/" className="brand login-brand"><span className="brand-mark">VC</span><span><strong>Villa Cruz</strong><small>GESTÃO</small></span></Link>
      <p className="eyebrow">ACESSO SEGURO</p><h1>Entrar na sua conta</h1><p className="subheading">Use o acesso fornecido pelo administrador do sistema.</p>
      {!supabase && <div className="notice"><strong>Ambiente de demonstração</strong><span>A autenticação estará disponível após configurar o projeto Supabase.</span></div>}
      <form action={signIn} className="login-form">
        <label className="field"><span>E-mail</span><input name="email" type="email" autoComplete="username" required maxLength={254} placeholder="voce@empresa.com.br" /></label>
        <label className="field"><span>Senha</span><input name="password" type="password" autoComplete="current-password" required maxLength={256} /></label>
        {errorMessage && <p className="error-message" role="alert">{errorMessage}</p>}
        <button className="button button-primary" type="submit" disabled={!supabase}>Entrar</button>
      </form>
      <Link href="/recuperar" className="recovery-link">Esqueci minha senha</Link>
      <p className="login-footnote">Acesso às informações financeiras é registrado para auditoria.</p>
    </section>
  </main>;
}
