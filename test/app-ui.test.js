const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { effectivePermissions } = require('../permissions');

const appSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

function element() {
  return {
    hidden: false,
    innerHTML: '',
    textContent: '',
    dataset: {},
    classList: { toggle() {}, remove() {}, add() {} },
    addEventListener() {},
    insertAdjacentHTML(_where, html) { this.innerHTML += html; },
    querySelector() { return element(); },
    querySelectorAll() { return []; },
  };
}

const flowFixture = {
  period: { from: '2026-10-01', to: '2026-10-15' }, account_id: null,
  accounts: [
    { id: 'a1', name: 'Itaú PJ', bank_name: 'Itaú', account_type: 'checking', opening_cents: '100000', opening_date: '2026-10-01', active: true, balance_cents: '150000' },
    { id: 'a2', name: 'Reserva Cora', bank_name: 'Cora', account_type: 'savings', opening_cents: '0', opening_date: '2026-10-01', active: false, balance_cents: '0' },
  ],
  cash: { cents: '40000', source: 'open', shift_name: 'Almoço' },
  bank_total_cents: '150000', available_cents: '190000', projected_cents: '160000',
  payables: { overdue_cents: '10000', due_7_cents: '5000', due_30_cents: '20000' },
  totals: { received_cents: '50000', spent_cents: '8000', deposited_cents: '0', withdrawn_cents: '0', transferred_out_cents: '0', transferred_in_cents: '0' },
  movements: [
    { id: 'm1', occurred_on: '2026-10-14', account_id: 'a1', account_name: 'Itaú PJ', direction: 'in', kind: 'receipt', amount_cents: '50000', category: 'Repasse', description: 'Repasse iFood', created_by_name: 'Ana', reverses_id: null, reversed_at: null, expense_payment_id: null },
    { id: 'm2', occurred_on: '2026-10-14', account_id: 'a1', account_name: 'Itaú PJ', direction: 'out', kind: 'payment', amount_cents: '8000', category: 'Pagamento de despesa', description: 'Fornecedor — Hortifruti', created_by_name: 'Ana', reverses_id: null, reversed_at: null, expense_payment_id: 'p1' },
  ],
};

async function launchApp({ role = 'owner', now = null, sales = [], cash = null, reportRows = [] } = {}) {
  class FixedDate extends Date {
    constructor(...args) { if (args.length) super(...args); else super(now); }
    static now() { return new Date(now).getTime(); }
  }
  const elements = new Map();
  const handlers = {};
  const byId = id => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  const document = {
    body: { dataset: {}, classList: { toggle() {} } },
    getElementById: byId,
    querySelector(selector) { return byId(selector.replace(/^#/, '')); },
    querySelectorAll() { return []; },
    addEventListener(type, handler) { (handlers[type] ||= []).push(handler); },
    createElement() { return element(); },
  };
  const expenseRows = [
    { id: 'partial', supplier: 'Fornecedor parcial', description: 'Insumos', document_number: '', category_name: 'Estoque', issue_date: '2026-10-01', due_date: '2026-10-30', total_cents: '1000', paid_cents: '250', installment_count: 1, status: 'open', derived_status: 'Em aberto', installments: [], attachments: [] },
    { id: 'paid', supplier: 'Fornecedor quitado', description: 'Serviço', document_number: '', category_name: 'Operacional', issue_date: '2026-10-01', due_date: '2026-10-10', total_cents: '2000', paid_cents: '2000', installment_count: 1, status: 'paid', derived_status: 'Paga', installments: [], attachments: [] },
  ];
  const fetch = async url => {
    let data;
    if (url === '/api/auth/csrf') data = { token: 'csrf-test' };
    else if (url === '/api/auth/me') data = { csrf: 'csrf-test', user: { name: 'Ana Gestora', role, roleLabel: 'Gestor', mustChangePassword: false, permissions: [...effectivePermissions(role, null)] }, units: [{ id: 'unit-1', name: 'Villa Cruz' }] };
    else if (String(url).startsWith('/api/dashboard')) data = {
      sales: { amount: '0', target: '0', days: 0 }, sales_month: { amount: '0', days: 0 }, finance_visible: true,
      cash_cents: '0', payables_cents: '2750',
      due: { overdue: 1, due_soon: 0 },
      stock: { expired: 1, expires_soon: 0, low_stock: 0 }, activity: [],
    };
    else if (String(url).startsWith('/api/operations/tasks')) data = [];
    else if (String(url).startsWith('/api/cash/discrepancies')) data = { rows: [], summary: { closures_with_difference: 0, positive_count: 0, positive_cents: '0', negative_count: 0, negative_cents: '0', absolute_cents: '0', net_cents: '0', opening_breaks: 0, opening_net_cents: '0' }, limits: null, alert: false, limited: false };
    else if (String(url).startsWith('/api/cash')) data = cash || { movements: [], open_session: null, balance_cents: '0' };
    else if (String(url).startsWith('/api/reports/run')) data = { title: 'Movimentações de estoque', columns: ['data', 'produto'], rows: reportRows, filters: {}, limited: false };
    else if (String(url).startsWith('/api/bank/flow')) data = flowFixture;
    else if (String(url).startsWith('/api/bank/accounts')) data = flowFixture.accounts;
    else if (String(url).startsWith('/api/payment-methods')) data = [{ id: 'pm1', name: 'Pix', fee_applicable: false, active: true, bank_account_id: 'a1', bank_account_name: 'Itaú PJ' }, { id: 'pm2', name: 'Dinheiro', fee_applicable: false, active: true, bank_account_id: null, bank_account_name: null }];
    else if (String(url).startsWith('/api/admin/users')) data = [{ id: 'u1', name: 'Ana Gestora', email: 'ana@x.com', role: 'admin', active: true, must_change_password: false, permissions: null }, { id: 'u2', name: 'Caio', email: 'caio@x.com', role: 'finance', active: true, must_change_password: false, permissions: null }, { id: 'u3', name: 'Bia', email: 'bia@x.com', role: 'operations', active: true, must_change_password: true, permissions: ['sales.view', 'sales.create', 'sales.edit'] }];
    else if (String(url).startsWith('/api/audit/users')) data = [];
    else if (String(url).startsWith('/api/audit')) data = [{ id: 'au1', action: 'create', entity_type: 'expense', entity_id: 'e1', reason: null, before_data: null, after_data: { total_cents: 100 }, created_at: '2026-10-14T15:00:00Z', ui_path: 'Financeiro › Despesas e notas › Registrar despesa › Salvar', user_name: 'Ana' }, { id: 'au2', action: 'update', entity_type: 'sale', entity_id: 's1', reason: null, before_data: null, after_data: null, created_at: '2026-10-13T15:00:00Z', ui_path: null, user_name: 'Caio' }];
    else if (String(url).startsWith('/api/sales')) data = sales;
    else if (String(url).startsWith('/api/dre')) data = { gross_revenue_cents: '0', deductions_cents: '0', operating_result_cents: '0', expense_groups: {} };
    else if (String(url).startsWith('/api/cash/forecast')) data = { projected_sales_cents: '0', projected_outflow_cents: '0', projected_net_cents: '0', previous_sales_cents: '0', previous_outflow_cents: '0', previous_net_cents: '0' };
    else if (String(url).startsWith('/api/expenses')) data = expenseRows;
    else if (String(url).startsWith('/api/categories')) data = [];
    else if (String(url).startsWith('/api/expense-natures')) data = [{ id: 'n1', name: 'Manutenção', expense_count: 2 }, { id: 'n2', name: 'Insumos', expense_count: 0 }];
    else if (String(url).startsWith('/api/settings')) data = {};
    else throw new Error(`Endpoint inesperado no teste: ${url}`);
    return { status: 200, ok: true, headers: { get: () => 'application/json' }, json: async () => data };
  };
  vm.runInNewContext(appSource, { document, fetch, Headers, Intl, BigInt, Date: now ? FixedDate : Date, URLSearchParams, setTimeout, console, location: { search: '' }, window: {} });
  for (let attempt = 0; attempt < 20 && !byId('page-content').innerHTML.includes('Ações do dia'); attempt++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return { document, handlers, byId };
}

test('painel mostra alertas acionáveis e direciona para os módulos', async () => {
  const { byId } = await launchApp();
  const html = byId('page-content').innerHTML;
  assert.match(html, /data-page-link="sales"/);
  assert.match(html, /data-page-link="expenses"/);
  assert.match(html, /data-page-link="inventory"/);
  assert.match(html, /data-page-link="cash"/);
  assert.match(html, /Faturamento de hoje não lançado/);
  assert.match(html, /data-do="stock-receive-quick"/);
  assert.match(html, /data-do="cash-movement-quick"/);
  assert.doesNotMatch(html, /data-page-link="inventory">＋ Receber estoque/);
});

test('caixa: a abertura traz o saldo acumulado do sistema e o campo para contar a gaveta', async () => {
  const closed = await openPage(await launchApp({ cash: { movements: [], open_session: null, balance_cents: '123456', balance_source: 'closed', carried_cents: '-50000' } }), 'cash', 'Caixa fechado');
  assert.match(closed, /data-do="cash-open"/);
  assert.match(closed, /R\$\s?1\.234,56/);
  assert.match(closed, /Saldo acumulado: último fechamento contado menos R\$\s?500,00 de depósitos e saques feitos desde então/);
  assert.match(closed, /Depósitos e saques podem ser feitos com o caixa fechado/);
  assert.match(closed, /informa o que contou na gaveta/);
  assert.doesNotMatch(closed, /name="opening_amount"/);
  const first = await openPage(await launchApp({ cash: { movements: [], open_session: null, balance_cents: '0', balance_source: 'none', carried_cents: '0' } }), 'cash', 'Caixa fechado');
  assert.match(first, /Nenhum turno foi fechado ainda/);
  const session = { id: 's1', shift_name: 'Almoço', opened_at: '2026-10-29T15:00:00Z', expected_cents: '19000', opening_system_cents: '20000', opening_counted_cents: '19000', opening_difference_cents: '-1000', opening_reason: 'Troco faltando' };
  const open = await openPage(await launchApp({ cash: { movements: [], open_session: session, balance_cents: '19000', balance_source: 'open', carried_cents: '0' } }), 'cash', 'Turno em andamento');
  assert.match(open, /Abertura conferida/);
  assert.match(open, /Falta/);
  assert.match(open, /Troco faltando/);
});

test('relatório de desperdício mostra o dia com o dia da semana', async () => {
  const rows = [
    { data: '2026-10-11', produto: 'Tomate', lote: 'L1', unidade: 'kg', quantidade: '2', motivo: 'Vencido', responsavel: 'Ana' },
    { data: '2026-10-14', produto: 'Alface', lote: '', unidade: 'kg', quantidade: '1', motivo: 'Queda', responsavel: 'Caio' },
  ];
  const single = await openPage(await launchApp({ reportRows: rows }), 'inventory-waste', 'Relatório de desperdício');
  assert.match(single, /Dia 11 - dom/);
  assert.match(single, /Dia 14 - qua/);
  assert.match(single, /title="11\/10\/2026"/);
  const multi = await openPage(await launchApp({ reportRows: [...rows, { ...rows[0], data: '2026-11-02' }] }), 'inventory-waste', 'Relatório de desperdício');
  assert.match(multi, /Dia 11\/10 - dom/);
  assert.match(multi, /Dia 02\/11 - seg/);
  const stamped = await openPage(await launchApp({ reportRows: [{ ...rows[0], data: '2026-10-12 01:30:00+00' }] }), 'inventory-waste', 'Relatório de desperdício');
  assert.match(stamped, /Dia 11 - dom<small class="muted"> · 22:30<\/small>/);
});

test('despesas mostram saldo pendente e não oferecem pagamento a uma despesa quitada', async () => {
  const { handlers, byId } = await launchApp();
  await handlers.click[0]({
    target: {
      id: '',
      closest(selector) { return selector === '[data-page-link]' ? { dataset: { pageLink: 'expenses' } } : null; },
    },
  });
  for (let attempt = 0; attempt < 20 && !byId('page-content').innerHTML.includes('Saldo aberto'); attempt++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  const html = byId('page-content').innerHTML;
  assert.match(html, /R\$\s?7,50/);
  assert.match(html, /Fornecedor parcial/);
  assert.match(html, /Fornecedor quitado/);
  assert.equal((html.match(/data-action="pay-expense"/g) || []).length, 1);
});

async function openPage(launched, page, marker) {
  await launched.handlers.click[0]({
    target: {
      id: '',
      closest(selector) { return selector === '[data-page-link]' ? { dataset: { pageLink: page } } : null; },
    },
  });
  for (let attempt = 0; attempt < 30 && !launched.byId('page-content').innerHTML.includes(marker); attempt++) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return launched.byId('page-content').innerHTML;
}

test('fluxo financeiro mostra saldos, gráficos e projeção; contas e extrato ficam em Bancos', async () => {
  const html = await openPage(await launchApp(), 'flow', 'Total disponível');
  assert.match(html, /R\$\s?1\.900,00/);
  assert.match(html, /R\$\s?400,00/);
  assert.match(html, /class="pbi-donut"/);
  assert.match(html, /pbi-bar-in/);
  assert.match(html, /flow-coverage/);
  assert.match(html, /data-page-link="banks"/);
  assert.match(html, /Itaú PJ/);
  assert.doesNotMatch(html, /id="bank-movement-form"/);
  assert.doesNotMatch(html, /data-bank-reverse=/);
});

test('fluxo financeiro em modo consulta não oferece ações de escrita', async () => {
  const html = await openPage(await launchApp({ role: 'auditor' }), 'flow', 'Total disponível');
  assert.match(html, /Total disponível/);
  assert.doesNotMatch(html, /data-do=/);
  assert.doesNotMatch(html, /data-bank-new/);
});

test('bancos: contas, atalhos por linha e banco de cada forma de pagamento', async () => {
  const html = await openPage(await launchApp(), 'banks', 'Forma de pagamento');
  for (const action of ['bank-deposit', 'bank-withdrawal', 'bank-transfer', 'bank-receipt', 'bank-fee', 'bank-new-account']) assert.match(html, new RegExp(`data-do="${action}"`));
  assert.equal((html.match(/data-ctx="bankacc"/g) || []).length, 2, 'uma linha de menu por conta');
  assert.equal((html.match(/data-ctx="bankmove"/g) || []).length, 2, 'uma linha de menu por movimento');
  assert.match(html, /data-ctx-open/);
  assert.match(html, /data-pm-bank="pm1"/);
  assert.match(html, /<option value="a1" selected>Itaú PJ<\/option>/, 'o Pix já cai no Itaú PJ');
  assert.match(html, /Origem/);
  assert.doesNotMatch(html, /id="bank-movement-form"/, 'o formulário só abre em popup');
});

test('bancos em modo consulta: vê contas e extrato, sem botões nem escolha de banco', async () => {
  const html = await openPage(await launchApp({ role: 'auditor' }), 'banks', 'Forma de pagamento');
  assert.match(html, /Itaú PJ/);
  assert.doesNotMatch(html, /data-do="bank-/);
  assert.doesNotMatch(html, /data-pm-bank=/);
});

test('despesas: linhas ganham atalhos sem repetir o botão de pagar', async () => {
  const html = await openPage(await launchApp(), 'expenses', 'Fornecedor parcial');
  assert.match(html, /data-ctx="expense"/);
  assert.equal((html.match(/data-action="pay-expense"/g) || []).length, 1);
});

test('usuários: lista com permissões e botão de novo usuário em popup (só administrador)', async () => {
  const html = await openPage(await launchApp({ role: 'admin' }), 'users', 'Usuários da unidade');
  assert.match(html, /data-do="user-new"/);
  assert.match(html, /data-ctx="user"/);
  assert.match(html, /Padrão do perfil/);
  assert.match(html, /Personalizado · 3 permissões/);
  assert.doesNotMatch(html, /id="user-form"/);
});

test('auditoria mostra o caminho percorrido e os nomes em português', async () => {
  const html = await openPage(await launchApp({ role: 'owner' }), 'audit', 'Caminho percorrido');
  assert.match(html, /Financeiro › Despesas e notas › Registrar despesa › Salvar/);
  assert.match(html, /Criou<\/strong> · Despesa/);
  assert.match(html, /Sem caminho \(registro antigo ou automático\)/);
});

test('operação não vê botões de editar acesso nem de cadastrar despesa na visão geral', async () => {
  const { byId } = await launchApp({ role: 'operations' });
  const html = byId('page-content').innerHTML;
  assert.doesNotMatch(html, /data-action="new-expense"/);
  assert.match(html, /data-action="new-sale"/);
});

test('visão geral desenha o faturamento diário em gráfico de área com mês anterior e rosca por canal', async () => {
  const sales = [];
  for (let day = 1; day <= 14; day++) {
    const dd = String(day).padStart(2, '0');
    sales.push({ sale_date: `2026-10-${dd}`, channel: 'Salão', amount_cents: String(300000 + day * 1000), status: 'confirmed' });
    sales.push({ sale_date: `2026-10-${dd}`, channel: 'iFood', amount_cents: '90000', status: 'confirmed' });
    sales.push({ sale_date: `2026-09-${dd}`, channel: 'Salão', amount_cents: '280000', status: 'confirmed' });
  }
  const launched = await launchApp({ now: '2026-10-15T15:00:00Z', sales });
  const html = launched.byId('page-content').innerHTML;
  assert.match(html, /id="pbi-area-fill"/);
  assert.match(html, /class="pbi-line cur"/);
  assert.match(html, /class="pbi-line prev"/);
  assert.match(html, /class="kpi-spark"/);
  assert.match(html, /class="pbi-donut"/);
  assert.ok(html.indexOf('data-dashboard-block="monthly-sales"') < html.indexOf('data-dashboard-block="daily-alerts"'), 'indicadores principais vêm antes dos alertas');
});

test('despesas: "Contas e notas" tem filtros de busca, status, categoria, natureza e período', async () => {
  const html = await openPage(await launchApp(), 'expenses', 'Fornecedor parcial');
  assert.match(html, /id="expense-list-filters"/);
  for (const key of ['q', 'status', 'category', 'nature', 'date_field', 'from', 'to']) assert.match(html, new RegExp(`data-expense-filter="${key}"`));
  assert.equal((html.match(/data-expense-row/g) || []).length, 2, 'cada lançamento pode ser filtrado');
  assert.match(html, /Últimos lançamentos primeiro/);
  assert.match(html, /data-expense-filter-empty hidden/);
});

test('configurações: naturezas de despesa podem ser adicionadas, editadas e removidas', async () => {
  const html = await openPage(await launchApp({ role: 'owner' }), 'settings', 'Naturezas de despesa');
  assert.match(html, /data-do="nature-new"/);
  assert.equal((html.match(/data-do="nature-edit"/g) || []).length, 2);
  assert.equal((html.match(/data-do="nature-delete"/g) || []).length, 2);
  assert.match(html, /2 lançamentos/);
});

test('usuários: administrador pode excluir usuários pela lista', async () => {
  const html = await openPage(await launchApp({ role: 'admin' }), 'users', 'Usuários da unidade');
  assert.match(html, /data-user-delete="u2"/);
});

test('permissões: só quem altera configurações pode mexer nas naturezas de despesa', () => {
  const { permissionFor } = require('../permissions');
  for (const [method, url] of [['POST', '/api/expense-natures'], ['PATCH', '/api/expense-natures/n1'], ['DELETE', '/api/expense-natures/n1']]) assert.equal(permissionFor(method, url), 'settings.manage');
  assert.equal(effectivePermissions('finance', null).has('settings.manage'), false);
  assert.equal(effectivePermissions('owner', null).has('settings.manage'), true);
});
