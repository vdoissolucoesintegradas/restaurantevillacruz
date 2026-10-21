import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MfaChallenge } from "./mfa-challenge";

export const dynamic = "force-dynamic";

export default async function MfaPage() {
  const supabase = await createClient();
  if (!supabase) redirect("/entrar");
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect("/entrar");
  const { data: memberships } = await supabase.from("memberships").select("role").eq("user_id", userId).eq("active", true);
  if (!memberships?.some((membership) => membership.role === "administrator")) redirect("/");
  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance?.currentLevel === "aal2") redirect("/");
  return <main className="login-screen"><section className="login-card">
    <p className="eyebrow">SEGUNDO FATOR OBRIGATÓRIO</p><h1>Proteja o acesso administrador</h1>
    <p className="subheading">Use um aplicativo autenticador para confirmar sua identidade.</p>
    <MfaChallenge/>
  </section></main>;
}
