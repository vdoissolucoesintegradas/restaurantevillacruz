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

async function launchApp() {
  const elements = new Map();
  const handlers = {};
  const byId = id => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  const document = {
    body: { classList: { toggle() {} } },
    getElementById: byId,
    querySelector(selector) { return byId(selector.replace(/^#/, '')); },
    querySelectorAll() { return []; },
    addEventListener(type, handler) { (handlers[type] ||= []).push(handler); },
    createElement() { return element(); },
  };
  const expenseRows = [
    { id: 'partial', supplier: 'Fornecedor parcial', description: 'Insumos', document_number: '', category_name: 'Estoque', issue_date: '2026-10-01', due_date: '2026-10-30', total_cents: '1000', paid_cents: '250', installment_count: 1, derived_status: 'Em aberto', attachments: [] },
    { id: 'paid', supplier: 'Fornecedor quitado', description: 'Serviço', document_number: '', category_name: 'Operacional', issue_date: '2026-10-01', due_date: '2026-10-10', total_cents: '2000', paid_cents: '2000', installment_count: 1, derived_status: 'Paga', attachments: [] },
  ];
  const fetch = async url => {
    let data;
    if (url === '/api/auth/csrf') data = { token: 'csrf-test' };
    else if (url === '/api/auth/me') data = { csrf: 'csrf-test', user: { name: 'Ana Gestora', role: 'owner', roleLabel: 'Gestor', mustChangePassword: false }, units: [{ id: 'unit-1', name: 'Villa Cruz' }] };
    else if (String(url).startsWith('/api/dashboard')) data = {
      sales: { amount: '0', target: '0', days: 0 }, finance_visible: true,
      cash_cents: '0', payables_cents: '2750',
      due: { overdue: 1, due_soon: 0 },
      stock: { expired: 1, expires_soon: 0, low_stock: 0 }, activity: [],
    };
    else if (String(url).startsWith('/api/cash')) data = { movements: [], open_session: null, balance_cents: '0' };
    else if (String(url).startsWith('/api/expenses')) data = expenseRows;
    else if (String(url).startsWith('/api/categories')) data = [];
    else throw new Error(`Endpoint inesperado no teste: ${url}`);
    return { status: 200, ok: true, headers: { get: () => 'application/json' }, json: async () => data };
  };
  vm.runInNewContext(appSource, { document, fetch, Headers, Intl, BigInt, Date, setTimeout, console });
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
