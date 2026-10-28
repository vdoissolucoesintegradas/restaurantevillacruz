'use strict';
// Leitura das planilhas históricas do Villa Cruz (caixa, notas fiscais, CMV e DRE).
// Funções puras: recebem os arquivos e devolvem um plano normalizado; não tocam o banco.
const crypto = require('crypto');
const ExcelJS = require('exceljs');

const MONTHS = { JANEIRO: 1, FEVEREIRO: 2, MARCO: 3, ABRIL: 4, MAIO: 5, JUNHO: 6, JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12 };
const MONTH_NAMES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const CMV_CATEGORY = 'CMV (regra pendente)';
const CATEGORY_BY_OBJECTIVE = { INSUMO: CMV_CATEGORY, LIMPESA: CMV_CATEGORY, LIMPEZA: CMV_CATEGORY, DESCARTAVEL: CMV_CATEGORY, VT: 'Pessoal', UNIFORME: 'Pessoal', MANUTENCAO: 'Ocupação', UTENCILIO: 'Ocupação', INVESTIMENTO: 'Ocupação' };
const ROW_LIMIT = 10001; // mesmo limite do importador padrão
const LONG_TERM_DAYS = 40;
// Ordem importa: a primeira regra que casar vence. O texto chega sem acento e em maiúsculas.
const CASH_OUTFLOW_RULES = [
  [/DEPOSITO/, 'Depósito bancário'],
  [/RETIRADA|\bPPR\b/, 'Retiradas e PPR'],
  [/UBER|GASOLINA|\bMOTO|COMBUST/, 'Transporte'],
  [/VALE DO FUNC|PAGAMENTO PELA LOJA|REEBOLSO|REEMBOLSO/, 'Pessoal'],
  [/^V ?T\b|VALE TRANS/, 'Vale transporte'],
  [/DIARIA|SALARIO|GRATIFICA|TREIN|UNIFORME|CAMISETA|JAQUETA|BORDADO/, 'Pessoal'],
  [/MANUTEN|PEDREIRO|GESSO|FERRAGEM|ELETRIC|\bCCM\b|\bRELE\b|TOMADA|UTEN[SC]|GARFO|FACA|LEITEIRA/, 'Manutenção e utensílios'],
  [/HORTIFRUTI|CARNE|CARVAO|\bPAO\b|\bPAD\b|\bGELO\b|CARREFOUR|BATATA|TREICHEL|PIZZA|OLEO|GUANABARA|POLSKA|PROPRINSUL|AGUA|ATACAD/, 'Compras de insumos']
];

const pad = n => String(n).padStart(2, '0');
const brDate = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
// Datas de célula viram dd/mm/aaaa em UTC (nunca o texto do fuso do servidor).
const str = v => (v instanceof Date && !Number.isNaN(v.getTime()) ? `${pad(v.getUTCDate())}/${pad(v.getUTCMonth() + 1)}/${v.getUTCFullYear()}` : String(v ?? ''));
const plain = value => str(value).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const clean = value => str(value).replace(/\s+/g, ' ').trim();
const money = c => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function cellValue(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object') {
    if ('result' in v) return cellValue(v.result);
    if ('richText' in v) return v.richText.map(t => t.text).join('');
    if ('text' in v) return v.text;
    return null;
  }
  return v;
}
const cell = (ws, r, c) => cellValue(ws.getRow(r).getCell(c).value);
function cents(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v * 100);
  if (typeof v !== 'string') return null;
  const s = v.trim().replace(/^R\$\s*/, '');
  if (!/^-?\d{1,3}(\.\d{3})*,\d{1,2}$|^-?\d+,\d{1,2}$|^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
function isoDate(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const m = String(v ?? '').trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toISOString().slice(0, 10) === iso ? iso : null;
}
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
function sheetMonth(name) {
  const parts = plain(name).split(' ');
  const month = MONTHS[parts[0]], year = Number(parts.find(p => /^\d{4}$/.test(p)));
  return month && year ? { year, month, key: `${year}-${pad(month)}`, label: `${MONTH_NAMES[month]} ${year}` } : null;
}
const lastDay = key => new Date(Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0)).toISOString().slice(0, 10);

function detectKind(ws) {
  if (!ws.rowCount) return null;
  const head = [];
  for (let r = 1; r <= Math.min(ws.rowCount, 12); r++) for (let c = 1; c <= Math.min(ws.columnCount, 14); c++) { const t = plain(cell(ws, r, c)); if (t) head.push([r, c, t]); }
  const has = (row, text) => head.some(([r, , t]) => (row === null || r === row) && t.includes(text));
  if (has(1, 'FORNECEDOR') && has(1, 'VENCIMENTO')) return 'invoices';
  if (has(null, 'OPERADORA') && has(null, 'SALDO DE CAIXA')) return 'cash';
  if (has(null, 'FATURAMENTO PROJETADO') && has(null, 'SEGUNDA')) return 'cmv';
  if (head.some(([, c, t]) => c === 1 && t.replace(/^\*\s*/, '') === 'RECEITA BRUTA')) return 'dre';
  return null;
}

function parseInvoices(ws, file, out) {
  const period = sheetMonth(ws.name), rows = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const supplier = clean(cell(ws, r, 2)), total = cents(cell(ws, r, 4)), rawIssue = cell(ws, r, 1);
    if (!supplier && total === null && rawIssue === null) continue;
    const where = { file, sheet: ws.name, line: r };
    const issue = isoDate(rawIssue);
    if (!supplier || total === null || total <= 0 || !issue) { out.warnings.push({ ...where, message: `Nota ignorada: ${!supplier ? 'fornecedor ausente' : !issue ? 'data de emissão inválida' : 'valor inválido'}.` }); continue; }
    const nfRaw = clean(cell(ws, r, 3)), nf = nfRaw && plain(nfRaw) !== 'X' ? nfRaw.slice(0, 100) : null;
    let due = isoDate(cell(ws, r, 5));
    if (due && Number(due.slice(0, 4)) - Number(issue.slice(0, 4)) > 1) {
      const fixed = `${issue.slice(0, 4)}${due.slice(4)}`;
      out.warnings.push({ ...where, message: `Vencimento ${brDate(due)} fora do padrão; usado ${brDate(fixed)} (mesmo ano da emissão). Confira.` });
      due = fixed;
    }
    const tag = `${supplier}${nf ? ` NF ${nf}` : ''}`;
    if (due && due < issue) out.warnings.push({ ...where, message: `${tag}: vencimento (${brDate(due)}) anterior à emissão (${brDate(issue)}). Mantido como está na planilha; a baixa presumida usa a data de emissão.` });
    else if (due && daysBetween(issue, due) > LONG_TERM_DAYS) out.warnings.push({ ...where, message: `${tag}: vencimento ${daysBetween(issue, due)} dias após a emissão (${brDate(issue)} → ${brDate(due)}). Confira se a data está certa.` });
    const objective = plain(cell(ws, r, 7)), nature = clean(cell(ws, r, 8)), obs = clean(cell(ws, r, 9));
    rows.push({ file, sheet: ws.name, line: r, supplier, nf, issue, due, total, objective, nature, obs, period: period?.key || issue.slice(0, 7) });
  }
  out.invoiceRows.push(...rows);
  out.files.push({ file, sheet: ws.name, kind: 'invoices', rows: rows.length, total_cents: rows.reduce((s, x) => s + x.total, 0) });
}

function buildExpenses(out) {
  const seen = new Map(), unique = [];
  for (const row of out.invoiceRows) {
    const key = [plain(row.supplier), row.nf || '', row.issue, row.due || '', row.total].join('|');
    if (row.nf && seen.has(key)) { out.warnings.push({ file: row.file || '', sheet: row.sheet, line: row.line, message: `${row.supplier} NF ${row.nf}: igual à linha ${seen.get(key)}; contada uma vez.` }); continue; }
    seen.set(key, `${row.sheet} ${row.line}`); unique.push(row);
  }
  const groups = new Map();
  for (const row of unique) {
    const key = row.nf ? `${plain(row.supplier)}|${row.nf}|${row.issue}` : `x|${row.file}|${row.sheet}|${row.line}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const repeats = new Map();
  for (const rows of groups.values()) {
    rows.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.line - b.line);
    const first = rows[0], dominant = rows.reduce((a, b) => (b.total > a.total ? b : a), rows[0]);
    const categoryOf = x => CATEGORY_BY_OBJECTIVE[x.objective] || 'Sem classificação';
    const category = categoryOf(dominant);
    if (new Set(rows.map(categoryOf)).size > 1) out.warnings.push({ file: first.file, sheet: first.sheet, line: first.line, message: `${first.supplier} NF ${first.nf}: linhas de categorias diferentes na mesma nota; o total ficou em "${category}".` });
    const natures = [...new Set(rows.map(x => x.nature).filter(Boolean))];
    const obs = [...new Set(rows.map(x => x.obs).filter(Boolean))].join(' / ');
    const bonus = /BONIFIC/.test(plain(obs));
    const method = /CART/.test(plain(obs)) ? 'Cartão de crédito' : /PIX/.test(plain(obs)) ? 'Pix' : null;
    const total = rows.reduce((s, x) => s + x.total, 0);
    const key = `Planilha NF · ${first.sheet} · linha${rows.length > 1 ? 's' : ''} ${rows.map(x => x.line).join(', ')}`;
    const base = [plain(first.supplier), first.issue, total, first.due || ''].join('|'), nth = (repeats.get(base) || 0) + 1;
    repeats.set(base, nth);
    const ref = `${base}|${nth}`;
    if (bonus) out.warnings.push({ file: first.file, sheet: first.sheet, line: first.line, message: `${first.supplier}${first.nf ? ` NF ${first.nf}` : ''}: produto bonificado (${money(total)}). Entra como nota cancelada (sem custo, sem pagamento e fora da DRE), só para ficar registrada.` });
    const nature = natures.join(' / ').slice(0, 120);
    out.expenses.push({
      key, ref, supplier: first.supplier, document_number: first.nf, issue_date: first.issue, accrual_date: first.issue,
      description: dominant.nature ? dominant.nature.charAt(0) + dominant.nature.slice(1).toLowerCase() : 'Compra', nature: nature || null,
      objective: dominant.objective || null, category, payment_method: method, total_cents: total, bonus,
      installments: rows.map((x, i) => ({ number: i + 1, amount_cents: x.total, due_date: x.due })),
      notes: `${key}\nref:${ref}${obs ? `\n${obs}` : ''}`
    });
  }
  // Compras repetidas parecem digitação dupla: avisa, mas não descarta nada.
  const noDoc = out.expenses.filter(e => !e.document_number && !e.key.includes('Planilha DRE'));
  const bySame = new Map();
  for (const e of noDoc) { const k = [plain(e.supplier), e.issue_date, e.total_cents].join('|'); (bySame.get(k) || bySame.set(k, []).get(k)).push(e); }
  for (const list of bySame.values()) if (list.length > 1) out.warnings.push({ file: '', sheet: '', line: 0, message: `Possível lançamento em duplicidade: ${list[0].supplier}, ${brDate(list[0].issue_date)}, ${money(list[0].total_cents)} aparece ${list.length} vezes (${list.map(e => e.key.replace('Planilha NF · ', '')).join('; ')}). As duas foram mantidas; confira.` });
  for (let i = 0; i < out.expenses.length; i++) for (let j = i + 1; j < out.expenses.length; j++) {
    const a = out.expenses[i], b = out.expenses[j];
    if (a.total_cents !== b.total_cents || !a.nature || !b.nature || plain(a.nature) !== plain(b.nature) || plain(a.supplier) === plain(b.supplier)) continue;
    if (a.document_number && b.document_number) continue;
    if (Math.abs(daysBetween(a.issue_date, b.issue_date)) > 3) continue;
    out.warnings.push({ file: '', sheet: '', line: 0, message: `Podem ser a mesma compra: ${a.supplier} (${brDate(a.issue_date)}) e ${b.supplier} (${brDate(b.issue_date)}), ${money(a.total_cents)}, "${a.nature}". As duas foram mantidas; confira.` });
  }
}

function parseCash(ws, file, out) {
  const period = sheetMonth(ws.name);
  if (!period) { out.warnings.push({ file, sheet: ws.name, line: 0, message: 'Aba de caixa ignorada: o nome precisa ser "MÊS ANO" (ex.: OUTUBRO 2026).' }); return; }
  let opening = 0, previousDate = null, lastSheetBalance = null, entries = 0, payments = 0;
  const movements = [], key = `Planilha CAIXA · ${ws.name}`;
  for (let r = 4; r <= ws.rowCount; r++) {
    const where = { file, sheet: ws.name, line: r };
    const rawDate = cell(ws, r, 1), entry = cell(ws, r, 2), operator = clean(cell(ws, r, 3)), desc = clean(cell(ws, r, 4)), value = cell(ws, r, 5), resp = clean(cell(ws, r, 6)), balance = cell(ws, r, 7);
    if (plain(desc).startsWith('SALDO DE CAIXA') && rawDate === null) { opening = cents(balance) ?? 0; lastSheetBalance = cents(balance); continue; }
    const inCents = typeof entry === 'number' ? cents(entry) : null, outCents = typeof value === 'number' ? cents(value) : null;
    if (!inCents && !outCents) { if (desc || operator) out.warnings.push({ ...where, message: `Linha sem valor ignorada${desc ? `: "${desc}"` : ''}.` }); continue; }
    let date = isoDate(typeof rawDate === 'string' ? rawDate.trim() : rawDate);
    if (!date || date.slice(0, 7) !== period.key) {
      const fixed = previousDate || `${period.key}-01`;
      out.warnings.push({ ...where, message: `Data ${date ? brDate(date) : 'ausente'} fora do mês da aba; usada ${brDate(fixed)} (${previousDate ? 'linha anterior' : 'primeiro dia do mês'}). Confira.` });
      date = fixed;
    }
    previousDate = date;
    if (balance !== null && cents(balance) !== null) lastSheetBalance = cents(balance);
    const responsible = /^[A-Za-zÀ-ÿ]{3,14}$/.test(resp) ? resp : null;
    const line = `${key} · linha ${r}`;
    if (inCents) {
      entries += inCents;
      if (desc) out.warnings.push({ ...where, message: `Entrada com descrição "${desc}" (${money(inCents)}) lançada como "Outras entradas", não como dinheiro do caixa.` });
      movements.push({ key: line, date, type: 'inflow', amount_cents: inCents, category: desc ? 'Outras entradas' : 'Entrada de dinheiro do caixa', description: desc ? `${desc} — ${operator || 'sem operadora'}` : `Dinheiro do caixa — ${operator || 'sem operadora'}`, responsible: operator || 'Não informado', notes: line });
    } else {
      const upper = plain(desc);
      const category = (CASH_OUTFLOW_RULES.find(([re]) => re.test(upper)) || [null, 'Outras despesas'])[1];
      payments += outCents;
      movements.push({ key: line, date, type: 'outflow', amount_cents: outCents, category, description: desc || 'Pagamento sem descrição', responsible: responsible || 'Não informado', notes: `${line}${operator ? ` · operadora ${operator}` : ''}${resp && !responsible ? ` · obs. da planilha: ${resp}` : ''}` });
    }
  }
  if (!movements.length) return;
  const expected = opening + entries - payments;
  if (lastSheetBalance !== null && lastSheetBalance !== expected) out.warnings.push({ file, sheet: ws.name, line: 0, message: `Saldo final da planilha (${(lastSheetBalance / 100).toFixed(2)}) difere da soma dos lançamentos (${(expected / 100).toFixed(2)}).` });
  const dates = movements.map(m => m.date).sort();
  out.cashSessions.push({ key, shift_name: `Caixa reserva · ${period.label}`, month: period.key, opening_cents: opening, first_date: dates[0], last_date: dates[dates.length - 1], expected_cents: expected, entries_cents: entries, payments_cents: payments, movements });
  out.files.push({ file, sheet: ws.name, kind: 'cash', rows: movements.length, entries_cents: entries, payments_cents: payments, opening_cents: opening, closing_cents: expected, sheet_balance_cents: lastSheetBalance });
}

function parseCmv(ws, file, out) {
  const period = sheetMonth(ws.name);
  const days = [];
  for (let r = 1; r < ws.rowCount; r++) {
    if (plain(cell(ws, r, 1)) !== 'DATA' || plain(cell(ws, r + 1, 1)) !== 'FATURAMENTO') continue;
    for (let c = 2; c <= 8; c++) {
      const date = isoDate(cell(ws, r, c)), amount = cell(ws, r + 1, c);
      if (!date || typeof amount !== 'number' || amount <= 0) continue;
      if (period && date.slice(0, 7) !== period.key) { out.warnings.push({ file, sheet: ws.name, line: r, message: `Dia ${brDate(date)} fora do mês da aba; ignorado.` }); continue; }
      days.push({ key: `Planilha CMV · ${ws.name} · ${brDate(date)}`, date, amount_cents: cents(amount), notes: `Planilha CMV · ${ws.name} · ${brDate(date)}` });
    }
  }
  if (!days.length) return;
  const total = days.reduce((s, d) => s + d.amount_cents, 0);
  let sheetTotal = null;
  for (let r = 1; r <= ws.rowCount; r++) if (plain(cell(ws, r, 8)).startsWith('TOTAL DO MES')) { sheetTotal = cell(ws, r, 9) ?? cell(ws, r + 1, 9); if (sheetTotal !== null) break; }
  const sheetCents = typeof sheetTotal === 'number' ? cents(sheetTotal) : null;
  if (sheetCents !== null && sheetCents !== total) out.warnings.push({ file, sheet: ws.name, line: 0, message: `Total do mês na planilha (${(sheetCents / 100).toFixed(2)}) difere da soma dos dias (${(total / 100).toFixed(2)}).` });
  else if (sheetCents === null && sheetTotal !== null) out.warnings.push({ file, sheet: ws.name, line: 0, message: `Total do mês está como texto ("${clean(sheetTotal)}"); usada a soma dos dias (${(total / 100).toFixed(2)}).` });
  out.sales.push(...days);
  out.files.push({ file, sheet: ws.name, kind: 'cmv', rows: days.length, total_cents: total, first_date: days.map(d => d.date).sort()[0], last_date: days.map(d => d.date).sort().pop() });
  out.notLoaded.push(`${ws.name}: consumo, cortesia e compras da semana (CMV) não têm campo no sistema; as compras entram pelas notas fiscais.`);
}

function parseDre(ws, file, out) {
  let year = 2026, monthName = null, monthCol = 2;
  for (let r = 1; r <= 6; r++) for (let c = 1; c <= ws.columnCount; c++) {
    const t = plain(cell(ws, r, c));
    const y = t.match(/\b(20\d{2})\b/); if (y) year = Number(y[1]);
    if (!monthName && MONTHS[t]) { monthName = t; monthCol = c; }
  }
  const month = MONTHS[monthName];
  if (!month) { out.warnings.push({ file, sheet: ws.name, line: 0, message: 'DRE ignorada: não encontrei o mês no cabeçalho.' }); return; }
  const key = `${year}-${pad(month)}`, label = `${MONTH_NAMES[month]} ${year}`, date = lastDay(key);
  let gross = null; const methods = [];
  for (let r = 1; r <= ws.rowCount; r++) {
    const name = plain(cell(ws, r, 1)).replace(/^\*\s*/, '');
    if (name === 'RECEITA BRUTA') gross = cents(cell(ws, r, monthCol));
    const label2 = { DINHEIRO: 'Dinheiro', DEBITO: 'Débito', CREDITO: 'Crédito', ALIMENTACAO: 'Alimentação', PIX: 'Pix' }[name];
    const amount = cents(cell(ws, r, monthCol));
    if (label2 && amount && !methods.some(m => m.method === label2)) methods.push({ method: label2, amount_cents: amount });
  }
  const total = methods.reduce((s, m) => s + m.amount_cents, 0);
  if (!methods.length) { out.warnings.push({ file, sheet: ws.name, line: 0, message: `DRE de ${label}: sem receita por forma de pagamento.` }); return; }
  if (gross !== null && gross !== total) out.warnings.push({ file, sheet: ws.name, line: 0, message: `Receita bruta (${(gross / 100).toFixed(2)}) difere da soma das formas de pagamento (${(total / 100).toFixed(2)}).` });
  for (const m of methods) out.sales.push({ key: `Planilha DRE · ${label} · ${m.method}`, date, amount_cents: m.amount_cents, notes: `Planilha DRE · ${label} · ${m.method}`, monthly: key });
  const block = {};
  for (let r = 1; r <= ws.rowCount; r++) { const name = plain(cell(ws, r, 6)); if (name && cents(cell(ws, r, 7)) !== null) block[name] = cents(cell(ws, r, 7)); }
  const cmvFinal = block['CMV FINAL'] ?? null;
  if (cmvFinal) {
    const calc = (block['INVENTARIO JUNHO'] || 0) + (block['COMPRAS JULHO'] || 0) - (block['INVENTARIO JULHO'] || 0) + (block['MOTOBOY / UBER'] || 0) + (block['DESCARTAVEIS'] || 0) - (block['ALMOCO FUNCIONARIOS - CORTESIA'] || 0);
    if (calc !== cmvFinal) out.warnings.push({ file, sheet: ws.name, line: 0, message: `CMV final da planilha (${(cmvFinal / 100).toFixed(2)}) não bate com a soma dos componentes (${(calc / 100).toFixed(2)}).` });
    const key2 = `Planilha DRE · ${label} · CMV consolidado`;
    out.expenses.push({ key: key2, ref: key2, supplier: `DRE ${label} (consolidado)`, document_number: null, issue_date: date, accrual_date: date, description: `CMV de ${label} — consolidado da planilha DRE`, nature: 'CMV', objective: 'CMV', category: CMV_CATEGORY, payment_method: null, total_cents: cmvFinal, installments: [{ number: 1, amount_cents: cmvFinal, due_date: date }], notes: `${key2}\nref:${key2}\nValor contábil consolidado (estoque inicial + compras − estoque final + extras − cortesia); não é um pagamento.`, settled: true });
  }
  out.notLoaded.push(`${ws.name}: despesas (aluguel, folha etc.) estão zeradas e as taxas são percentuais fixos; não foram lançadas.`);
  out.files.push({ file, sheet: ws.name, kind: 'dre', rows: methods.length, total_cents: total, month: key, cmv_cents: cmvFinal });
}

async function parseLegacyWorkbooks(files) {
  const out = { sales: [], expenses: [], cashSessions: [], invoiceRows: [], files: [], warnings: [], notLoaded: [], ignored: [] };
  const seenSheets = new Map();
  for (const f of files) {
    const wb = new ExcelJS.Workbook();
    try { await wb.xlsx.load(f.buffer); } catch { out.warnings.push({ file: f.name, sheet: '', line: 0, message: 'Arquivo não pôde ser lido como XLSX.' }); continue; }
    for (const ws of wb.worksheets) {
      const kind = detectKind(ws);
      if (!kind) { if (ws.rowCount) out.ignored.push(`${f.name} · ${ws.name}`); continue; }
      if (ws.rowCount > ROW_LIMIT) { out.warnings.push({ file: f.name, sheet: ws.name, line: 0, message: `Aba ignorada: ${ws.rowCount} linhas excedem o limite de ${ROW_LIMIT - 1}. Apague as linhas vazias formatadas no final e envie de novo.` }); continue; }
      const signature = `${kind}|${plain(ws.name)}`;
      if (seenSheets.has(signature)) { out.warnings.push({ file: f.name, sheet: ws.name, line: 0, message: `Aba repetida: a aba "${ws.name}" já foi lida em "${seenSheets.get(signature)}". Esta cópia foi ignorada para não duplicar lançamentos.` }); continue; }
      seenSheets.set(signature, f.name);
      if (kind === 'invoices') parseInvoices(ws, f.name, out);
      else if (kind === 'cash') parseCash(ws, f.name, out);
      else if (kind === 'cmv') parseCmv(ws, f.name, out);
      else parseDre(ws, f.name, out);
    }
  }
  buildExpenses(out);
  delete out.invoiceRows;
  out.sales.sort((a, b) => a.date.localeCompare(b.date));
  out.expenses.sort((a, b) => a.issue_date.localeCompare(b.issue_date) || a.key.localeCompare(b.key));
  out.cashSessions.sort((a, b) => a.month.localeCompare(b.month));
  out.digest = crypto.createHash('sha256').update(JSON.stringify({ s: out.sales, e: out.expenses, c: out.cashSessions })).digest('hex');
  return out;
}

// Como cada parcela entra: 'paid' (baixa presumida) ou 'open'. policy: past_paid | all_open | all_paid.
// record:false = baixa sem registro de pagamento (valor contábil consolidado).
function settleInstallment(expense, installment, policy, today) {
  if (expense.bonus) return { paid: false };
  if (expense.settled) return { paid: true, paid_on: installment.due_date || expense.issue_date, record: false };
  const afterIssue = d => (d < expense.issue_date ? expense.issue_date : d);
  const noDue = !installment.due_date;
  if (policy === 'all_open') return { paid: false };
  if (policy === 'all_paid') return { paid: true, paid_on: noDue ? expense.issue_date : afterIssue(installment.due_date < today ? installment.due_date : today) };
  if (noDue) return { paid: true, paid_on: expense.issue_date };
  return installment.due_date <= today ? { paid: true, paid_on: afterIssue(installment.due_date) } : { paid: false };
}

module.exports = { parseLegacyWorkbooks, settleInstallment, CMV_CATEGORY, ROW_LIMIT };
