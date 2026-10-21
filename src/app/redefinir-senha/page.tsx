import Link from "next/link";
import { updatePassword } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ erro?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { erro } = await searchParams;
  const { data: claims } = supabase ? await supabase.auth.getClaims() : { data: null };
  const signedIn = Boolean(claims?.claims.sub);
  return <main className="login-screen"><section className="login-card">
    <Link href="/entrar" className="brand login-brand"><span className="brand-mark">VC</span><span><strong>Villa Cruz</strong><small>GESTÃO</small></span></Link>
    <p className="eyebrow">RECUPERAÇÃO DE ACESSO</p><h1>Criar nova senha</h1>
    {!signedIn ? <p className="subheading">Abra o link enviado por e-mail para continuar.</p> : <>
      <p className="subheading">Use pelo menos 14 caracteres.</p>
      <form action={updatePassword} className="login-form"><label className="field"><span>Nova senha</span><input name="password" type="password" autoComplete="new-password" required minLength={14} maxLength={128}/></label>
        {erro && <p className="error-message" role="alert">Não foi possível atualizar a senha. Confira os requisitos e tente novamente.</p>}
        <button className="button button-primary">Atualizar senha</button></form>
    </>}
  </section></main>;
}
