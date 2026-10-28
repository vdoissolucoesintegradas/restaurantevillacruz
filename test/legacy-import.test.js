const { test } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const { parseLegacyWorkbooks, settleInstallment } = require('../legacy-import');

async function workbook(sheets) {
  const wb = new ExcelJS.Workbook();
  for (const [name, rows] of Object.entries(sheets)) { const ws = wb.addWorksheet(name); rows.forEach(r => ws.addRow(r)); }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
const d = iso => new Date(`${iso}T00:00:00Z`);

test('notas fiscais: agrupa parcelas, remove duplicata entre abas e corrige vencimento digitado errado', async () => {
  const head = ['DATA', 'FORNECEDOR', 'Nº NF', 'VALOR', 'VENCIMENTO', 'STATUS VENCIMENTO', 'OBJ. NEGÓCIO', 'NAT. OPERAÇÃO', 'OBS'];
  const buffer = await workbook({
    'SETEMBRO 2026': [head,
      [d('2026-09-01'), 'EMBALAPEL', '6599', 236, d('2026-09-10'), '', 'DESCARTAVEL', 'DESCARTAVEL'],
      [d('2026-09-01'), 'EMBALAPEL', '6599', 236, d('2026-09-20'), '', 'DESCARTAVEL', 'DESCARTAVEL'],
      [d('2026-09-02'), 'RUDI BONOW', 'X', 52, 'X', 'X', 'INSUMO', 'HORTIFRUTI', 'AVISTA'],
      [d('2026-09-03'), 'KROLOW', '10', 100, d('2029-10-01'), '', 'INSUMO', 'CARNE', 'CARTÃO CRED.'],
      [d('2026-09-30'), 'HIGICENTER', '52886', 368.72, d('2026-10-14'), '', 'LIMPESA', 'LIMPESA']],
    'OUTUBRO 2026': [head,
      [d('2026-09-30'), 'HIGICENTER', '52886', 368.72, d('2026-10-14'), '', 'LIMPESA', 'LIMPESA'],
      [d('2026-10-01'), 'PRATI TRANSPORT', 'X', 850, 'X', 'X', 'VT', 'VT']]
  });
  const plan = await parseLegacyWorkbooks([{ name: 'nf.xlsx', buffer }]);
  assert.equal(plan.expenses.length, 5);
  const embalapel = plan.expenses.find(e => e.supplier === 'EMBALAPEL');
  assert.equal(embalapel.installments.length, 2);
  assert.equal(embalapel.total_cents, 47200);
  assert.deepEqual(embalapel.installments.map(i => i.due_date), ['2026-09-10', '2026-09-20']);
  assert.equal(plan.expenses.filter(e => e.supplier === 'HIGICENTER').length, 1);
  const krolow = plan.expenses.find(e => e.supplier === 'KROLOW');
  assert.equal(krolow.installments[0].due_date, '2026-10-01');
  assert.equal(krolow.payment_method, 'Cartão de crédito');
  assert.equal(plan.expenses.find(e => e.supplier === 'PRATI TRANSPORT').category, 'Pessoal');
  assert.equal(embalapel.category, 'CMV (regra pendente)');
  assert.ok(plan.warnings.some(w => /igual à linha/.test(w.message)));
  assert.ok(plan.warnings.some(w => /fora do padrão/.test(w.message)));
  assert.equal(new Set(plan.expenses.map(e => e.key)).size, plan.expenses.length);
});

test('caixa: saldo conferido, data fora do mês corrigida e categorias por descrição', async () => {
  const head = ['DATA DO CAIXA', 'ENTRADA (DINHEIRO CAIXA )', 'OPERADORA', 'PAGTO. EFETUADO (DESCRIÇÃO )', 'VALOR', 'RESPONSAVEL PELO PAG.', 'SALDO DE CAIXA'];
  const buffer = await workbook({
    'SETEMBRO 2026': [['', '', '', 'CAIXA RESERVA PARA PAG. VIA LOJA'], [], head,
      [null, null, null, 'SALDO DE CAIXA', null, null, 100],
      [d('2026-09-01'), 50, 'WENDELL', null, null, null, 150],
      [d('2026-09-01'), null, 'WENDELL', 'VT ROSANE', 25, 'CAIO', 125],
      [d('2029-09-02'), null, 'JAINE', 'DEPOSITO BANCARIO', 40, 'obs qualquer', 85]]
  });
  const plan = await parseLegacyWorkbooks([{ name: 'caixa.xlsx', buffer }]);
  assert.equal(plan.cashSessions.length, 1);
  const s = plan.cashSessions[0];
  assert.equal(s.opening_cents, 10000);
  assert.equal(s.expected_cents, 8500);
  assert.equal(s.movements.length, 3);
  assert.equal(s.movements[2].date, '2026-09-01');
  assert.equal(s.movements[1].category, 'Vale transporte');
  assert.equal(s.movements[1].responsible, 'CAIO');
  assert.equal(s.movements[2].category, 'Depósito bancário');
  assert.equal(s.movements[2].responsible, 'Não informado');
  assert.ok(plan.warnings.some(w => /fora do mês/.test(w.message)));
  assert.ok(!plan.warnings.some(w => /Saldo final/.test(w.message)));
});

test('CMV semanal e DRE mensal viram faturamento diário/mensal e CMV consolidado', async () => {
  const cmv = await workbook({
    'OUTUBRO 2026': [['', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO', 'FATURAMENTO PROJETADO'],
      ['Data', null, null, null, d('2026-10-01'), d('2026-10-02'), d('2026-10-03'), d('2026-10-04')],
      ['Faturamento', null, null, null, 100.5, 200, 300, 0]]
  });
  const dre = await workbook({
    'DRE MENSUALIZADO': [[], ['RESULTADOS VILLA CRUZ 2026'], [], ['', 'JULHO'], ['* RECEITA BRUTA', 300],
      ['* Dinheiro', 100], ['* Débito', 120], ['Pix', 80], [], [],
      ['CMV', null, null, null, null, 'CMV - Julho 2026'],
      ['', null, null, null, null, 'Inventário Junho', 50],
      ['', null, null, null, null, 'Compras Julho', 200],
      ['', null, null, null, null, 'Inventário Julho', 30],
      ['', null, null, null, null, 'CMV FINAL', 220]]
  });
  const plan = await parseLegacyWorkbooks([{ name: 'cmv.xlsx', buffer: cmv }, { name: 'dre.xlsx', buffer: dre }]);
  const october = plan.sales.filter(s => s.date.startsWith('2026-10'));
  assert.deepEqual(october.map(s => [s.date, s.amount_cents]), [['2026-10-01', 10050], ['2026-10-02', 20000], ['2026-10-03', 30000]]);
  const july = plan.sales.filter(s => s.monthly === '2026-07');
  assert.equal(july.length, 3);
  assert.equal(july.reduce((n, s) => n + s.amount_cents, 0), 30000);
  assert.ok(july.every(s => s.date === '2026-07-31'));
  const cmvExpense = plan.expenses.find(e => e.settled);
  assert.equal(cmvExpense.total_cents, 22000);
  assert.equal(cmvExpense.category, 'CMV (regra pendente)');
  assert.ok(!plan.warnings.some(w => /não bate/.test(w.message)));
});

test('abas desconhecidas são ignoradas e o resumo (digest) muda quando os dados mudam', async () => {
  const other = await workbook({ Planilha1: [['a', 'b'], [1, 2]] });
  const plan = await parseLegacyWorkbooks([{ name: 'x.xlsx', buffer: other }]);
  assert.equal(plan.files.length, 0);
  assert.equal(plan.ignored.length, 1);
  const a = await parseLegacyWorkbooks([{ name: 'a.xlsx', buffer: await workbook({ 'OUTUBRO 2026': [['', 'SEGUNDA', 'FATURAMENTO PROJETADO'], ['Data', d('2026-10-05')], ['Faturamento', 10]] }) }]);
  const b = await parseLegacyWorkbooks([{ name: 'a.xlsx', buffer: await workbook({ 'OUTUBRO 2026': [['', 'SEGUNDA', 'FATURAMENTO PROJETADO'], ['Data', d('2026-10-05')], ['Faturamento', 11]] }) }]);
  assert.notEqual(a.digest, b.digest);
});

test('baixa presumida das parcelas conforme a opção escolhida', () => {
  const expense = { issue_date: '2026-10-01' };
  const past = { due_date: '2026-10-10' }, future = { due_date: '2026-11-10' }, none = { due_date: null };
  assert.deepEqual(settleInstallment(expense, past, 'past_paid', '2026-10-28'), { paid: true, paid_on: '2026-10-10' });
  assert.deepEqual(settleInstallment(expense, future, 'past_paid', '2026-10-28'), { paid: false });
  assert.deepEqual(settleInstallment(expense, none, 'past_paid', '2026-10-28'), { paid: true, paid_on: '2026-10-01' });
  assert.deepEqual(settleInstallment(expense, past, 'all_open', '2026-10-28'), { paid: false });
  assert.deepEqual(settleInstallment(expense, future, 'all_paid', '2026-10-28'), { paid: true, paid_on: '2026-10-28' });
  assert.deepEqual(settleInstallment({ ...expense, settled: true }, future, 'all_open', '2026-10-28'), { paid: true, paid_on: '2026-11-10', record: false });
  assert.deepEqual(settleInstallment({ ...expense, bonus: true }, past, 'all_paid', '2026-10-28'), { paid: false });
  assert.deepEqual(settleInstallment(expense, { due_date: '2026-09-20' }, 'past_paid', '2026-10-28'), { paid: true, paid_on: '2026-10-01' });
});

const head = ['DATA', 'FORNECEDOR', 'Nº NF', 'VALOR', 'VENCIMENTO', 'STATUS VENCIMENTO', 'OBJ. NEGÓCIO', 'NAT. OPERAÇÃO', 'OBS'];

test('mesma aba enviada duas vezes é lida uma vez e avisada', async () => {
  const buffer = await workbook({ 'SETEMBRO 2026': [head, [d('2026-09-01'), 'KROLOW', 'X', 10, 'X', '', 'INSUMO', 'CARNE']] });
  const plan = await parseLegacyWorkbooks([{ name: 'nf.xlsx', buffer }, { name: 'nf (1).xlsx', buffer }]);
  assert.equal(plan.expenses.length, 1);
  assert.equal(plan.files.length, 1);
  assert.ok(plan.warnings.some(w => /Aba repetida/.test(w.message) && w.file === 'nf (1).xlsx'));
});

test('notas sem NF repetidas ganham chave por conteúdo distinta e aviso de possível duplicidade', async () => {
  const buffer = await workbook({ 'SETEMBRO 2026': [head,
    [d('2026-09-08'), 'TREICHEL', 'X', 760.87, 'X', '', 'INSUMO', 'CANE', 'CARTÃO CRED.'],
    [d('2026-09-08'), 'TREICHEL', 'X', 760.87, 'X', '', 'INSUMO', 'CARNE', 'CARTÃO CRED.']] });
  const plan = await parseLegacyWorkbooks([{ name: 'nf.xlsx', buffer }]);
  assert.equal(plan.expenses.length, 2);
  assert.notEqual(plan.expenses[0].ref, plan.expenses[1].ref);
  assert.ok(plan.expenses.every(e => e.ref.startsWith('TREICHEL|2026-09-08|76087|')));
  assert.ok(plan.expenses.every(e => e.notes.split('\n')[1] === 'ref:' + e.ref));
  assert.ok(plan.warnings.some(w => /duplicidade/.test(w.message)));
});

test('produto bonificado vira nota em revisão e não gera pagamento', async () => {
  const buffer = await workbook({ 'SETEMBRO 2026': [head, [d('2026-09-01'), 'MAR', '1459672', 100.36, 'X', 'X', 'INSUMO', 'CORAÇÃO', 'PRODUTO BONIFICADO']] });
  const plan = await parseLegacyWorkbooks([{ name: 'nf.xlsx', buffer }]);
  assert.equal(plan.expenses[0].bonus, true);
  assert.deepEqual(settleInstallment(plan.expenses[0], plan.expenses[0].installments[0], 'past_paid', '2026-10-28'), { paid: false });
  assert.ok(plan.warnings.some(w => /bonificado/.test(w.message)));
});

test('nota com várias linhas usa a natureza da linha de maior valor e a data em observação sai em dd/mm/aaaa', async () => {
  const buffer = await workbook({ 'SETEMBRO 2026': [head,
    [d('2026-09-02'), 'KROLOW', '351868', 92.3, d('2026-09-20'), '', 'LIMPESA', 'LIMPESA'],
    [d('2026-09-02'), 'KROLOW', '351868', 4327.97, d('2026-09-20'), '', 'INSUMO', 'MERCEARIA', d('2026-09-09')]] });
  const plan = await parseLegacyWorkbooks([{ name: 'nf.xlsx', buffer }]);
  assert.equal(plan.expenses.length, 1);
  assert.equal(plan.expenses[0].description, 'Mercearia');
  assert.equal(plan.expenses[0].nature, 'LIMPESA / MERCEARIA');
  assert.ok(plan.expenses[0].notes.includes('09/09/2026'));
  assert.ok(!/GMT/.test(plan.expenses[0].notes));
});

test('caixa: entrada com descrição não vira dinheiro do caixa e as regras de categoria usam palavras inteiras', async () => {
  const cashHead = ['DATA DO CAIXA', 'ENTRADA (DINHEIRO CAIXA )', 'OPERADORA', 'PAGTO. EFETUADO (DESCRIÇÃO )', 'VALOR', 'RESPONSAVEL PELO PAG.', 'SALDO DE CAIXA'];
  const rows = [['', '', '', 'CAIXA RESERVA'], [], cashHead, [null, null, null, 'SALDO DE CAIXA', null, null, 0],
    [d('2026-09-01'), 1700, 'CAIO', 'FUNDO DE RESERVA', null, null, 1700],
    [d('2026-09-01'), 300, 'JAINE', null, null, null, 2000]];
  const outs = [['UBER ( KROLOW E TREICHEL CAIO )', 'Transporte'], ['PAD. PANEMIO', 'Compras de insumos'], ['V T YASMIN', 'Vale transporte'], ['SHOOP CAMISETA UNIFORME 12 UM.', 'Pessoal'],
    ['UTENCILIO/LEITEIRA PRA AGUA', 'Manutenção e utensílios'], ['ANGELO MOTORISTA FOLGA', 'Transporte'], ['MONGELO XPTO', 'Outras despesas'], ['PAGAMENTO PELA LOJA/WENDELL', 'Pessoal']];
  let balance = 2000;
  for (const [desc] of outs) { balance -= 10; rows.push([d('2026-09-02'), null, 'JAINE', desc, 10, null, balance]); }
  const plan = await parseLegacyWorkbooks([{ name: 'caixa.xlsx', buffer: await workbook({ 'SETEMBRO 2026': rows }) }]);
  const s = plan.cashSessions[0];
  assert.equal(s.movements[0].category, 'Outras entradas');
  assert.equal(s.movements[0].description, 'FUNDO DE RESERVA — CAIO');
  assert.equal(s.movements[1].category, 'Entrada de dinheiro do caixa');
  outs.forEach(([desc, category], i) => assert.equal(s.movements[2 + i].category, category, desc));
  assert.ok(plan.warnings.some(w => /FUNDO DE RESERVA/.test(w.message)));
});

test('aba com linhas demais é ignorada e nome de aba desconhecido não derruba a leitura', async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('SETEMBRO 2026');
  ws.addRow(head); ws.addRow([d('2026-09-01'), 'KROLOW', 'X', 10, 'X', '', 'INSUMO', 'CARNE']);
  ws.getCell('A10005').value = 'x';
  const plan = await parseLegacyWorkbooks([{ name: 'grande.xlsx', buffer: Buffer.from(await wb.xlsx.writeBuffer()) }]);
  assert.equal(plan.files.length, 0);
  assert.ok(plan.warnings.some(w => /excedem o limite/.test(w.message)));
});
