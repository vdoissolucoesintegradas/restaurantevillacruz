const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');

function element() {
  return {
    hidden: false,
    innerHTML: '',
    textContent: '',
    dataset: {},
    classList: { toggle() {}, remove() {}, add() {} },
    addEventListener() {},
    querySelector() { return element(); },
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

async function launchApp({ role = 'owner', now = null, sales = [] } = {}) {
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
    else if (url === '/api/auth/me') data = { csrf: 'csrf-test', user: { name: 'Ana Gestora', role, roleLabel: 'Gestor', mustChangePassword: false }, units: [{ id: 'unit-1', name: 'Villa Cruz' }] };
    else if (String(url).startsWith('/api/dashboard')) data = {
      sales: { amount: '0', target: '0', days: 0 }, sales_month: { amount: '0', days: 0 }, finance_visible: true,
      cash_cents: '0', payables_cents: '2750',
      due: { overdue: 1, due_soon: 0 },
      stock: { expired: 1, expires_soon: 0, low_stock: 0 }, activity: [],
    };
    else if (String(url).startsWith('/api/operations/tasks')) data = [];
    else if (String(url).startsWith('/api/cash')) data = { movements: [], open_session: null, balance_cents: '0' };
    else if (String(url).startsWith('/api/bank/flow')) data = flowFixture;
    else if (String(url).startsWith('/api/bank/accounts')) data = flowFixture.accounts;
    else if (String(url).startsWith('/api/sales')) data = sales;
    else if (String(url).startsWith('/api/dre')) data = { gross_revenue_cents: '0', deductions_cents: '0', operating_result_cents: '0', expense_groups: {} };
    else if (String(url).startsWith('/api/cash/forecast')) data = { projected_sales_cents: '0', projected_outflow_cents: '0', projected_net_cents: '0', previous_sales_cents: '0', previous_outflow_cents: '0', previous_net_cents: '0' };
    else if (String(url).startsWith('/api/expenses')) data = expenseRows;
    else if (String(url).startsWith('/api/categories')) data = [];
    else throw new Error(`Endpoint inesperado no teste: ${url}`);
    return { status: 200, ok: true, headers: { get: () => 'application/json' }, json: async () => data };
  };
  vm.runInNewContext(appSource, { document, fetch, Headers, Intl, BigInt, Date: now ? FixedDate : Date, URLSearchParams, setTimeout, console, location: { search: '' } });
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

test('fluxo financeiro mostra saldos, gráficos e extrato para quem pode movimentar', async () => {
  const html = await openPage(await launchApp(), 'flow', 'Total disponível');
  assert.match(html, /R\$\s?1\.900,00/);
  assert.match(html, /R\$\s?400,00/);
  assert.match(html, /class="pbi-donut"/);
  assert.match(html, /pbi-bar-in/);
  assert.match(html, /flow-coverage/);
  assert.match(html, /id="bank-movement-form"/);
  assert.match(html, /data-bank-new/);
  assert.match(html, /Itaú PJ/);
  assert.equal((html.match(/data-bank-reverse=/g) || []).length, 1, 'só o recebimento pode ser estornado; pagamento de despesa não');
});

test('fluxo financeiro em modo consulta não oferece formulário nem ações de escrita', async () => {
  const html = await openPage(await launchApp({ role: 'auditor' }), 'flow', 'Total disponível');
  assert.match(html, /Total disponível/);
  assert.doesNotMatch(html, /id="bank-movement-form"/);
  assert.doesNotMatch(html, /data-bank-reverse=/);
  assert.doesNotMatch(html, /data-bank-new/);
  assert.doesNotMatch(html, /data-bank-edit=/);
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
