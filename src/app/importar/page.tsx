import Link from "next/link";
import { Importer } from "./importer";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const supabase = await createClient();
  let companies: Array<{ id: string; name: string }> = [];
  let userName = "Demonstração";
  if (supabase) {
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims.sub;
    if (!userId) redirect("/entrar");
    if (userId) {
      const { data: memberships } = await supabase.from("memberships").select("company_id, role, companies(name)").eq("user_id", userId).eq("active", true);
      companies = (memberships ?? []).map((membership) => ({ id: membership.company_id, name: (membership.companies as unknown as { name: string } | null)?.name ?? "Empresa" }));
      userName = String(claims?.claims.email ?? "Usuário");
    }
  }

  return <main className="app-shell">
    <header className="topbar"><Link href="/" className="brand"><span className="brand-mark">VC</span><span><strong>Villa Cruz</strong><small>GESTÃO</small></span></Link><div className="topbar-right"><span className="user-avatar">{userName.slice(0, 1).toUpperCase()}</span><span>{userName}</span></div></header>
    <div className="layout">
      <aside className="sidebar"><p className="nav-caption">ESPAÇO DE TRABALHO</p><Link href="/" className="nav-item"><span>⌂</span>Visão geral</Link><Link href="/importar" className="nav-item active"><span>⇧</span>Importar planilhas</Link><div className="sidebar-footer"><span className="status-dot"/> Fase 1 · Fundamentos</div></aside>
      <div className="main-content">
        <div className="breadcrumb">Fundamentos <span>/</span> Importação</div>
        <div className="page-heading"><div><p className="eyebrow">MIGRAÇÃO DE DADOS</p><h1>Importar planilhas</h1><p className="subheading">Confira o conteúdo original e as linhas que precisam de revisão antes de guardar um rascunho.</p></div><span className="status-pill">Rascunho · sem confirmação</span></div>
        {!supabase && <div className="notice notice-wide"><strong>Banco ainda não configurado</strong><span>A prévia funciona localmente. Para guardar rascunhos, configure as variáveis Supabase e crie usuários autorizados.</span></div>}
        <Importer companies={companies}/>
      </div>
    </div>
  </main>;
}
