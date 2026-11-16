const express = require('express');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');
const { effectivePermissions } = require('../permissions');

const outputDir = process.argv[2] || path.join(__dirname, '..', 'visual-checks');
const today = '2026-11-15';
const command = {
  snapshot: { business_date: today, sales: { entries: 0, amount_cents: '0', channels: 0 }, pending_receipts: { entries: 3, amount_cents: '124500' }, open_cash: { id: 'cash-1', shift_name: 'Jantar', opened_at: '2026-11-15T18:00:00-03:00' }, cash_closures: { entries: 0, absolute_difference_cents: '0' }, unclassified_expenses: 2 },
  closure: null, day_status: 'open', data_quality: { sales: 'missing', dre: 'partial', receipts: 'pending' }, pending: { total: 2, critical: 1, in_progress: 1 }, updated_at: '2026-11-15T22:10:00-03:00'
};
const pending = [
  { id: 'p1', item_type: 'overdue_expenses', severity: 'critical', title: '4 contas vencidas', detail: 'Saldo vencido registrado. Confira credores, pagamentos e prazos.', origin_page: 'expenses', assigned_to: 'Marina Financeiro', due_on: today, status: 'in_progress', events: [{ event_type: 'opened', to_status: 'open', note: 'Pendência detectada pelo sistema.', created_at: '2026-11-15T12:00:00-03:00', created_by_name: 'Ana' }, { event_type: 'assigned', from_status: 'open', to_status: 'in_progress', note: 'Conferência iniciada.', created_at: '2026-11-15T15:00:00-03:00', created_by_name: 'Ana' }] },
  { id: 'p2', item_type: 'missing_sales', severity: 'high', title: 'Faturamento de 15/11/2026 não informado', detail: 'A ausência de lançamento é tratada como dado ausente, não como faturamento igual a zero.', origin_page: 'sales', assigned_to: null, due_on: today, status: 'open', events: [{ event_type: 'opened', to_status: 'open', note: 'Pendência detectada pelo sistema.', created_at: '2026-11-15T20:00:00-03:00', created_by_name: 'Ana' }] }
];

function response(url) {
  if (url.includes('/api/auth/csrf')) return { token: 'visual-csrf' };
  if (url.includes('/api/auth/me')) return { csrf: 'visual-csrf', user: { id: 'u1', name: 'Ana Gestora', role: 'owner', roleLabel: 'Proprietária/Gestora', mustChangePassword: false, permissions: [...effectivePermissions('owner', null)] }, units: [{ id: 'unit-1', name: 'Villa Cruz' }] };
  if (url.includes('/api/management/command')) return command;
  if (url.includes('/api/management/pending')) return pending;
  if (url.includes('/api/dashboard')) return { sales: { amount: '0', target: '0', days: 0 }, sales_month: { amount: '19422583', days: 15 }, finance_visible: true, payables_cents: '3002948', cash_cents: '714488', stock: { low_stock: 2, expired: 0, expires_soon: 1 }, due: { overdue: 4, due_soon: 3 } };
  if (url.includes('/api/operations/tasks')) return [];
  if (url.includes('/api/cash/forecast')) return { projected_sales_cents: '0', projected_outflow_cents: '2532027', projected_net_cents: '-2532027', previous_sales_cents: '19422583', previous_outflow_cents: '17000000', previous_net_cents: '2422583' };
  if (url.includes('/api/cash')) return { movements: [], open_session: command.snapshot.open_cash, balance_cents: '714488', balance_source: 'open', carried_cents: '0' };
  if (url.includes('/api/sales')) return [];
  if (url.includes('/api/dre')) return { period: { start: '2026-11-01', end: today }, gross_revenue_cents: '0', deductions_cents: '0', net_revenue_cents: '0', operating_result_cents: '-3002948', expense_groups: { cmv: '0', operating: '3002948', unclassified: '0' }, classified: true, validation: { label: 'Resultado parcial · não validado', missing: ['faturamento confirmado no período', 'regra de CMV validada pela gestão/contabilidade'] }, methodology: 'Receita por faturamento e despesas por competência.' };
  return [];
}

(async () => {
  await fs.mkdir(outputDir, { recursive: true });
  const staticApp = express();
  staticApp.use(express.static(path.join(__dirname, '..', 'public')));
  const server = await new Promise(resolve => { const instance = staticApp.listen(0, '127.0.0.1', () => resolve(instance)); });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.VISUAL_BROWSER || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const results = [];
  try {
    for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      await page.route('**/api/**', route => route.request().url().includes('/api/public/login-logo')?route.fulfill({ path: path.join(__dirname, '..', 'public', 'villa-cruz-logo.png') }):route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response(route.request().url())) }));
      await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle' });
      await page.locator('[data-page="pending"]').evaluate(element => element.click());
      await page.getByRole('heading', { name: 'Central de pendências', exact: true }).waitFor();
      const metrics = await page.evaluate(() => {
        const visible = element => { const style = getComputedStyle(element), rect = element.getBoundingClientRect(); return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0; };
        const offenders = [...document.querySelectorAll('#page-content *')].filter(visible).filter(element => { const rect = element.getBoundingClientRect(); return rect.right > document.documentElement.clientWidth + 1 || rect.left < -1; }).slice(0, 12).map(element => ({ tag: element.tagName, class: element.className, text: element.textContent.trim().slice(0, 50), rect: element.getBoundingClientRect().toJSON() }));
        const cards = [...document.querySelectorAll('.pending-item')].map(card => ({ width: card.getBoundingClientRect().width, headingTop: card.querySelector('h2').getBoundingClientRect().top }));
        const heading=document.querySelector('.page-heading')?.getBoundingClientRect(),panel=document.querySelector('.daily-close-panel')?.getBoundingClientRect();
        return { viewport: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, offenders, cards, heading:heading?.toJSON(), panel:panel?.toJSON(), headingStyle:document.querySelector('.page-heading')?{height:getComputedStyle(document.querySelector('.page-heading')).height,marginBottom:getComputedStyle(document.querySelector('.page-heading')).marginBottom}:null };
      });
      await page.screenshot({ path: path.join(outputDir, `pending-${viewport.name}.png`), fullPage: true });
      results.push({ ...viewport, ...metrics });
      await page.locator('[data-page="dre"]').evaluate(element => element.click());
      await page.getByRole('heading', { name: 'DRE gerencial', exact: true }).waitFor();
      const dreMetrics = await page.evaluate(() => {
        const visible = element => { const style = getComputedStyle(element), rect = element.getBoundingClientRect(); return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0; };
        const offenders = [...document.querySelectorAll('#page-content *')].filter(visible).filter(element => { const rect = element.getBoundingClientRect(); return rect.right > document.documentElement.clientWidth + 1 || rect.left < -1; }).slice(0, 12).map(element => ({ tag: element.tagName, class: element.className, text: element.textContent.trim().slice(0, 50) }));
        const headings=[...document.querySelectorAll('.dre-validation-card h2,.dre-report-card h2')].map(element=>element.getBoundingClientRect().top);
        return { viewport: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, offenders, headings };
      });
      await page.screenshot({ path: path.join(outputDir, `dre-${viewport.name}.png`), fullPage: true });
      results.push({ ...viewport, name: `${viewport.name}-dre`, ...dreMetrics });
      await page.close();
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  console.log(JSON.stringify(results, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
