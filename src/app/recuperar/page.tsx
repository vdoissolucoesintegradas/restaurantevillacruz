import Link from "next/link";
import { requestPasswordReset } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ enviado?: string }> };

export default async function RecoverPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { enviado } = await searchParams;
  return <main className="login-screen"><section className="login-card">
    <Link href="/entrar" className="brand login-brand"><span className="brand-mark">VC</span><span><strong>Villa Cruz</strong><small>GESTÃO</small></span></Link>
    <p className="eyebrow">RECUPERAÇÃO DE ACESSO</p><h1>Redefinir senha</h1>
    {enviado ? <p className="form-message">Se o endereço estiver cadastrado, você receberá instruções para redefinir a senha.</p> : <>
      <p className="subheading">Informe o e-mail da conta. Enviaremos um link se ele estiver cadastrado.</p>
      {!supabase && <p className="form-message">Configure o Supabase para ativar a recuperação de senha.</p>}
      <form action={requestPasswordReset} className="login-form">
        <label className="field"><span>E-mail</span><input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
        <button className="button button-primary" disabled={!supabase}>Enviar instruções</button>
      </form>
    </>}
    <Link href="/entrar" className="recovery-link">Voltar para entrar</Link>
  </section></main>;
}
