import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  let userName = "Ambiente de demonstração";
  let companyName = "Villa Cruz";
  if (supabase) {
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims.sub;
    if (!userId) redirect("/entrar");
    userName = String(data?.claims.email ?? "Usuário");
    const { data: membership } = await supabase.from("memberships").select("company_id, companies(name)").eq("user_id", userId).eq("active", true).limit(1).maybeSingle();
    companyName = (membership?.companies as unknown as { name: string } | null)?.name ?? "Empresa não configurada";
    const { data: allMemberships } = await supabase.from("memberships").select("role").eq("user_id", userId).eq("active", true);
    if (allMemberships?.some((item) => item.role === "administrator")) {
      const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance?.currentLevel !== "aal2") redirect("/mfa");
    }
  }

  return <main className="app-shell">
    <header className="topbar"><Link href="/" className="brand"><span className="brand-mark">VC</span><span><strong>Villa Cruz</strong><small>GESTÃO</small></span></Link><div className="topbar-right"><span className="top-company">{companyName}</span><span className="user-avatar">{userName.slice(0, 1).toUpperCase()}</span><span className="user-name">{userName}</span>{supabase && <form action={signOut}><button className="text-button">Sair</button></form>}</div></header>
    <div className="layout">
      <aside className="sidebar"><p className="nav-caption">ESPAÇO DE TRABALHO</p><Link href="/" className="nav-item active"><span>⌂</span>Visão geral</Link><Link href="/importar" className="nav-item"><span>⇧</span>Importar planilhas</Link><div className="sidebar-footer"><span className="status-dot"/> Fase 1 · Fundamentos</div></aside>
      <div className="main-content">
        <div className="breadcrumb">{companyName}<span>/</span> Visão geral</div>
        <div className="welcome-row"><div><p className="eyebrow">TERÇA-FEIRA, 20 DE OUTUBRO DE 2026</p><h1>Bom dia</h1><p className="subheading">Seu espaço de gestão da operação diária.</p></div><Link className="button button-primary" href="/importar"><span>＋</span> Preparar importação</Link></div>
        {!supabase && <div className="notice notice-wide"><strong>Prévia de produto</strong><span>Os arquivos de referência ainda não estão disponíveis. Nenhum valor financeiro é exibido ou presumido. A autenticação e o banco passam a ser usados após configurar o projeto próprio.</span><Link href="/entrar" className="notice-link">Acessar login →</Link></div>}
        <section className="metric-grid" aria-label="Indicadores do período">
          <article className="metric-card"><div className="metric-label"><span className="metric-icon indigo">▤</span><span>Faturamento</span></div><strong className="metric-empty">Aguardando dados</strong><small>Período não importado</small></article>
          <article className="metric-card"><div className="metric-label"><span className="metric-icon green">◎</span><span>Meta x realizado</span></div><strong className="metric-empty">Sem período ativo</strong><small>Metas serão configuradas por vigência</small></article>
          <article className="metric-card"><div className="metric-label"><span className="metric-icon orange">▱</span><span>Compras e CMV</span></div><strong className="metric-empty">Aguardando validação</strong><small>Componentes permanecem separados</small></article>
          <article className="metric-card"><div className="metric-label"><span className="metric-icon red">◷</span><span>Contas a vencer</span></div><strong className="metric-empty">Sem lançamentos</strong><small>Sem dados suficientes para calcular</small></article>
        </section>
        <section className="lower-grid">
          <article className="panel focus-panel"><div className="panel-heading"><div><p className="eyebrow">PRÓXIMA ETAPA</p><h2>Validar as fontes de dados</h2></div><span className="step-number">01</span></div><p>Antes de migrar saldos, precisamos mapear as abas, fórmulas e períodos das planilhas originais.</p><div className="file-check"><span className="file-badge">XLSX</span><span><strong>4 planilhas de referência</strong><small>Aguardando inclusão no espaço de trabalho</small></span><span className="pending-tag">Pendente</span></div><Link className="button button-secondary" href="/importar">Abrir prévia de importação</Link></article>
          <article className="panel progress-panel"><p className="eyebrow">ANDAMENTO</p><h2>Fases de entrega</h2><div className="phase-row current"><span className="phase-indicator">1</span><span><strong>Fundamentos</strong><small>Autenticação, permissões, auditoria e importador</small></span><em>Em preparação</em></div><div className="phase-row"><span className="phase-indicator">2</span><span><strong>Rotina diária</strong><small>Faturamento, despesas, anexos e caixa</small></span><em>Planejada</em></div><div className="phase-row"><span className="phase-indicator">3</span><span><strong>Gestão</strong><small>DRE, relatórios e conciliação</small></span><em>Planejada</em></div><div className="phase-row"><span className="phase-indicator">4</span><span><strong>Automação</strong><small>Lembretes, OCR e integrações</small></span><em>Planejada</em></div></article>
        </section>
        <footer className="app-footer"><span>Villa Cruz · Gestão financeira e operacional</span><span><span className="status-dot"/> Período não iniciado</span></footer>
      </div>
    </div>
  </main>;
}
