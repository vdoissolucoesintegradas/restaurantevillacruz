'use strict';
const {cashDetails,saveDetails}=require('./traceability');
// Editar, excluir (visível, com restauração) e manter coerentes os lançamentos de faturamento,
// despesas, pagamentos, movimentos de caixa e movimentos bancários.
module.exports = function registerEntryRoutes(app, d) {
  const { routeUnit, inTx, audit, fail, text, parseMoney, validDate, localToday, periodIsClosed, id, paymentMethodLabel, pool } = d;
  const DAY = 'T12:00:00-03:00';
  const brDate = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  const userError = (message, status = 409) => Object.assign(new Error(message), { userMessage: message, status });
  const reasonOf = req => text((req.body || {}).reason, 300) || null;
  const closedMsg = (what, date) => `O mês de ${brDate(date).slice(3)} está fechado. Reabra o período com justificativa antes de ${what}.`;
  const dateText = v => (v instanceof Date ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}` : String(v || '').slice(0, 10));
  const run = fn => async (req, res, next) => {
    try { const u = await routeUnit(req, res); if (!u) return; const out = await fn(req, res, u); if (out && out.error) return fail(res, out.status || 409, out.error); if (out === null) return fail(res, 404, 'Lançamento não encontrado.'); if (out !== undefined) res.json(out); } catch (e) { if (e && e.userMessage) return fail(res, e.status || 409, e.userMessage); next(e); }
  };

  // ---------- Faturamento ----------
  const saleInput = (b, old) => {
    const date = b.sale_date === undefined ? dateText(old.sale_date) : b.sale_date, amount = b.amount === undefined ? Number(old.amount_cents) : parseMoney(b.amount);
    const target = b.target === undefined ? (old.target_cents === null ? null : Number(old.target_cents)) : (b.target === '' || b.target === null ? null : parseMoney(b.target));
    if (!validDate(date) || amount === null || amount < 0 || (b.target !== undefined && b.target !== '' && b.target !== null && target === null)) return { error: 'Informe uma data válida e um faturamento igual ou maior que zero.', status: 400 };
    return { date, amount, target, channel: text(b.channel === undefined ? old.channel : b.channel || 'Salão', 80), notes: b.notes === undefined ? old.notes : text(b.notes, 2000) || null };
  };
  app.patch('/api/sales/:id', run((req, res, u) => inTx(async c => {
    const old = (await c.query('SELECT * FROM sales WHERE id=$1 AND unit_id=$2 FOR UPDATE', [req.params.id, u.id])).rows[0]; if (!old) return null;
    if (old.status === 'void') return { error: 'Este faturamento foi excluído. Restaure antes de editar.' };
    const v = saleInput(req.body || {}, old); if (v.error) return v;
    for (const day of new Set([dateText(old.sale_date), v.date])) if (await periodIsClosed(u.id, day, c)) return { error: closedMsg('editar o faturamento', day) };
    const row = (await c.query('UPDATE sales SET sale_date=$1,channel=$2,amount_cents=$3,target_cents=$4,notes=$5,updated_at=now() WHERE id=$6 RETURNING *', [v.date, v.channel, v.amount, v.target, v.notes, old.id])).rows[0];
    await audit(c, req, u.id, 'update', 'sale', old.id, old, row, reasonOf(req)); return row;
  })));
  app.delete('/api/sales/:id', run((req, res, u) => inTx(async c => {
    const old = (await c.query('SELECT * FROM sales WHERE id=$1 AND unit_id=$2 FOR UPDATE', [req.params.id, u.id])).rows[0]; if (!old) return null;
    if (old.status === 'void') return { error: 'Este faturamento já foi excluído.' };
    if (await periodIsClosed(u.id, dateText(old.sale_date), c)) return { error: closedMsg('excluir o faturamento', dateText(old.sale_date)) };
    const row = (await c.query("UPDATE sales SET status='void',deleted_at=now(),deleted_by=$1,updated_at=now() WHERE id=$2 RETURNING *", [req.session.user.id, old.id])).rows[0];
    await audit(c, req, u.id, 'delete', 'sale', old.id, old, row, reasonOf(req)); return row;
  })));
  app.post('/api/sales/:id/restore', run((req, res, u) => inTx(async c => {
    const old = (await c.query('SELECT * FROM sales WHERE id=$1 AND unit_id=$2 FOR UPDATE', [req.params.id, u.id])).rows[0]; if (!old) return null;
    if (old.status !== 'void') return { error: 'Este faturamento não está excluído.' };
    if (await periodIsClosed(u.id, dateText(old.sale_date), c)) return { error: closedMsg('restaurar o faturamento', dateText(old.sale_date)) };
    const row = (await c.query("UPDATE sales SET status='confirmed',deleted_at=NULL,deleted_by=NULL,updated_at=now() WHERE id=$1 RETURNING *", [old.id])).rows[0];
    await audit(c, req, u.id, 'restore', 'sale', old.id, old, row, reasonOf(req)); return row;
  })));

  // ---------- Despesas ----------
  function installmentPlan(total, count, dueDate) {
    const base = Math.floor(total / count), rem = total - base * count, out = [];
    for (let i = 0; i < count; i++) {
      let due = null;
      if (dueDate) { const b = new Date(`${dueDate}T12:00:00Z`), day = b.getUTCDate(); const t = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth() + i, 1, 12)); t.setUTCDate(Math.min(day, new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0, 12)).getUTCDate())); due = t.toISOString().slice(0, 10); }
      out.push({ n: i + 1, amount: base + (i === count - 1 ? rem : 0), due });
    }
    return out;
  }
  const paidOf = async (c, expenseId) => BigInt((await c.query('SELECT COALESCE(sum(paid_cents),0)::text s FROM expense_installments WHERE expense_id=$1', [expenseId])).rows[0].s);
  app.patch('/api/expenses/:id', run((req, res, u) => inTx(async c => {
    const old = (await c.query('SELECT * FROM expenses WHERE id=$1 AND unit_id=$2 FOR UPDATE', [req.params.id, u.id])).rows[0]; if (!old) return null;
    if (old.status === 'cancelled') return { error: 'Esta despesa foi excluída ou cancelada. Restaure antes de editar.' };
    const b = req.body || {}, paid = await paidOf(c, old.id), pick = (k, cur) => (b[k] === undefined ? cur : b[k]);
    let supplierId = b.supplier_id === undefined ? old.supplier_id : (text(b.supplier_id, 80) || null);
    let supplier = text(pick('supplier', old.supplier), 160);
    if (supplierId) { const linked = (await c.query('SELECT id,name FROM suppliers WHERE id=$1 AND unit_id=$2 AND active', [supplierId, u.id])).rows[0]; if (!linked) return { error: 'Fornecedor inválido para esta unidade.', status: 400 }; supplier = linked.name; }
    const description = text(pick('description', old.description), 250), issue = pick('issue_date', dateText(old.issue_date));
    const accrual = b.accrual_date !== undefined ? (validDate(b.accrual_date) ? b.accrual_date : issue) : (b.issue_date !== undefined && dateText(old.accrual_date) === dateText(old.issue_date) ? issue : dateText(old.accrual_date));
    const total = b.total === undefined ? Number(old.total_cents) : parseMoney(b.total), count = b.installment_count === undefined ? old.installment_count : Math.max(1, Math.min(120, Number(b.installment_count)));
    const due = b.due_date === undefined ? (old.due_date ? dateText(old.due_date) : null) : (b.due_date || null);
    if (!supplier || !description || !validDate(issue) || total === null || total < 0 || !Number.isInteger(count) || (due && !validDate(due))) return { error: 'Revise fornecedor, descrição, datas, valor e quantidade de parcelas.', status: 400 };
    const structural = total !== Number(old.total_cents) || count !== old.installment_count || (due || null) !== (old.due_date ? dateText(old.due_date) : null);
    if (structural && paid > 0n) return { error: 'Esta despesa já tem pagamentos. Para mudar valor, parcelas ou vencimento, exclua os pagamentos primeiro.' };
    for (const day of new Set([dateText(old.accrual_date), accrual])) if (await periodIsClosed(u.id, day, c)) return { error: closedMsg('editar a despesa', day) };
    let categoryId = b.category_id === undefined ? old.category_id : (text(b.category_id, 80) || null);
    if (categoryId && categoryId !== old.category_id && !(await c.query("SELECT 1 FROM categories WHERE id=$1 AND unit_id=$2 AND kind='expense'", [categoryId, u.id])).rowCount) return { error: 'Categoria financeira inválida para esta unidade.', status: 400 };
    const method = b.payment_method === undefined ? old.payment_method : await paymentMethodLabel(u.id, b.payment_method);
    if (structural) { await c.query('DELETE FROM expense_installments WHERE expense_id=$1', [old.id]); for (const p of installmentPlan(total, count, due)) await c.query('INSERT INTO expense_installments(id,expense_id,installment_number,amount_cents,due_date) VALUES($1,$2,$3,$4,$5)', [id(), old.id, p.n, p.amount, p.due]); }
    const purchaseOrderId = b.purchase_order_id === undefined ? old.purchase_order_id : (text(b.purchase_order_id, 80) || null);
    if (purchaseOrderId && !(await c.query('SELECT 1 FROM purchase_orders WHERE id=$1 AND unit_id=$2 AND supplier_id=$3', [purchaseOrderId, u.id, supplierId])).rowCount) return { error: 'O pedido escolhido não pertence a este fornecedor.', status: 400 };
    const row = (await c.query('UPDATE expenses SET supplier=$1,supplier_id=$2,purchase_order_id=$3,document_number=$4,issue_date=$5,accrual_date=$6,category_id=$7,description=$8,total_cents=$9,due_date=$10,payment_method=$11,nature=$12,installment_count=$13,notes=$14,updated_at=now() WHERE id=$15 RETURNING *',
      [supplier, supplierId, purchaseOrderId, b.document_number === undefined ? old.document_number : text(b.document_number, 120) || null, issue, accrual, categoryId, description, total, due, method, b.nature === undefined ? old.nature : text(b.nature, 100) || null, count, b.notes === undefined ? old.notes : text(b.notes, 2000) || null, old.id])).rows[0];
    await audit(c, req, u.id, 'update', 'expense', old.id, old, row, reasonOf(req)); return row;
  })));
  app.delete('/api/expenses/:id', run((req, res, u) => inTx(async c => {
    const old = (await c.query('SELECT * FROM expenses WHERE id=$1 AND unit_id=$2 FOR UPDATE', [req.params.id, u.id])).rows[0]; if (!old) return null;
    if (old.status === 'cancelled') return { error: 'Esta despesa já foi excluída ou cancelada.' };
    if ((await paidOf(c, old.id)) > 0n) return { error: 'Esta despesa tem pagamentos registrados. Exclua os pagamentos primeiro.' };
    if (await periodIsClosed(u.id, dateText(old.accrual_date), c)) return { error: closedMsg('excluir a despesa', dateText(old.accrual_date)) };
    const row = (await c.query("UPDATE expenses SET status_before_delete=status,status='cancelled',deleted_at=now(),deleted_by=$1,updated_at=now() WHERE id=$2 RETURNING *", [req.session.user.id, old.id])).rows[0];
    await audit(c, req, u.id, 'delete', 'expense', old.id, old, row, reasonOf(req)); return row;
  })));
  app.post('/api/expenses/:id/restore', run((req, res, u) => inTx(async c => {
    const old = (await c.query('SELECT * FROM expenses WHERE id=$1 AND unit_id=$2 FOR UPDATE', [req.params.id, u.id])).rows[0]; if (!old) return null;
    if (old.status !== 'cancelled' || !old.deleted_at) return { error: 'Esta despesa não foi excluída por aqui.' };
    if (await periodIsClosed(u.id, dateText(old.accrual_date), c)) return { error: closedMsg('restaurar a despesa', dateText(old.accrual_date)) };
    const row = (await c.query("UPDATE expenses SET status=COALESCE(status_before_delete,'open'),status_before_delete=NULL,deleted_at=NULL,deleted_by=NULL,updated_at=now() WHERE id=$1 RETURNING *", [old.id])).rows[0];
    await audit(c, req, u.id, 'restore', 'expense', old.id, old, row, reasonOf(req)); return row;
  })));

  // ---------- Pagamentos de despesa ----------
  async function paymentContext(c, u, expenseId, paymentId) {
    const exp = (await c.query('SELECT * FROM expenses WHERE id=$1 AND unit_id=$2 FOR UPDATE', [expenseId, u.id])).rows[0];
    const pay = exp && (await c.query('SELECT * FROM expense_payments WHERE id=$1 AND expense_id=$2 FOR UPDATE', [paymentId, expenseId])).rows[0];
    if (!exp || !pay) return null;
    const inst = (await c.query('SELECT * FROM expense_installments WHERE id=$1 FOR UPDATE', [pay.installment_id])).rows[0];
    const cash = pay.cash_movement_id ? (await c.query('SELECT m.*,s.closed_at session_closed FROM cash_movements m LEFT JOIN cash_sessions s ON s.id=m.session_id WHERE m.id=$1 FOR UPDATE OF m', [pay.cash_movement_id])).rows[0] : null;
    const bank = (await c.query('SELECT b.*,a.opening_date::text acc_opening FROM bank_movements b JOIN bank_accounts a ON a.id=b.account_id WHERE b.expense_payment_id=$1 FOR UPDATE OF b', [pay.id])).rows[0] || null;
    return { exp, pay, inst, cash, bank };
  }
  const syncStatus = async (c, expenseId, total) => { const paid = await paidOf(c, expenseId); await c.query("UPDATE expenses SET status=$1,updated_at=now() WHERE id=$2", [paid >= BigInt(total) ? 'paid' : 'open', expenseId]); };
  app.patch('/api/expenses/:id/payments/:paymentId', run((req, res, u) => inTx(async c => {
    const ctx = await paymentContext(c, u, req.params.id, req.params.paymentId); if (!ctx) return null;
    const { exp, pay, inst, cash, bank } = ctx, b = req.body || {};
    if (exp.status === 'cancelled') return { error: 'Esta despesa está excluída. Restaure antes de alterar pagamentos.' };
    const amount = b.amount === undefined ? Number(pay.amount_cents) : parseMoney(b.amount), paidOn = b.paid_on === undefined ? dateText(pay.paid_on) : b.paid_on;
    if (amount === null || amount <= 0 || !validDate(paidOn)) return { error: 'Informe valor e data de pagamento válidos.', status: 400 };
    if ((bank || cash) && paidOn > localToday()) return { error: 'A data do pagamento pelo caixa ou banco não pode estar no futuro.', status: 400 };
    if (cash && cash.session_closed) return { error: 'O caixa em que este pagamento saiu já foi fechado. Não dá para alterar o pagamento.' };
    if (cash && cash.deleted_at) return { error: 'O movimento de caixa deste pagamento foi excluído.' };
    if (bank && paidOn < bank.acc_opening) return { error: 'A data do pagamento é anterior ao saldo inicial da conta bancária.' };
    if (BigInt(inst.paid_cents) - BigInt(pay.amount_cents) + BigInt(amount) > BigInt(inst.amount_cents)) return { error: 'O pagamento excede o saldo da parcela.' };
    const method = b.payment_method === undefined ? pay.payment_method : (await paymentMethodLabel(u.id, b.payment_method)) || null, responsible = b.responsible === undefined ? pay.responsible : text(b.responsible, 160) || pay.responsible;
    await c.query('UPDATE expense_installments SET paid_cents=paid_cents-$1+$2 WHERE id=$3', [pay.amount_cents, amount, inst.id]);
    const row = (await c.query('UPDATE expense_payments SET amount_cents=$1,paid_on=$2,payment_method=$3,responsible=$4 WHERE id=$5 RETURNING *', [amount, paidOn, method, responsible, pay.id])).rows[0];
    if (cash) await c.query('UPDATE cash_movements SET amount_cents=$1,gross_amount_cents=$1,occurred_at=$2,payment_method=$3,responsible=$4,updated_at=now() WHERE id=$5', [amount, `${paidOn}${DAY}`, method, responsible, cash.id]);
    if (bank) await c.query('UPDATE bank_movements SET amount_cents=$1,occurred_on=$2,updated_at=now() WHERE id=$3', [amount, paidOn, bank.id]);
    await syncStatus(c, exp.id, exp.total_cents);
    await audit(c, req, u.id, 'update', 'expense_payment', pay.id, pay, row, reasonOf(req)); return row;
  })));
  app.delete('/api/expenses/:id/payments/:paymentId', run((req, res, u) => inTx(async c => {
    const ctx = await paymentContext(c, u, req.params.id, req.params.paymentId); if (!ctx) return null;
    const { exp, pay, inst, cash, bank } = ctx;
    if (exp.status === 'cancelled') return { error: 'Esta despesa está excluída. Restaure antes de alterar pagamentos.' };
    if (cash && cash.session_closed) return { error: 'O caixa em que este pagamento saiu já foi fechado. Não dá para excluir o pagamento.' };
    if (bank) { const rev = await c.query('SELECT 1 FROM bank_movements WHERE reverses_id=$1', [bank.id]); if (rev.rowCount || bank.reversed_at) return { error: 'O lançamento bancário deste pagamento foi estornado. Não dá para excluir o pagamento.' }; }
    await c.query('UPDATE expense_installments SET paid_cents=paid_cents-$1 WHERE id=$2', [pay.amount_cents, inst.id]);
    if (bank) await c.query('DELETE FROM bank_movements WHERE id=$1', [bank.id]);
    await c.query('DELETE FROM expense_payments WHERE id=$1', [pay.id]);
    if (cash) await c.query('UPDATE cash_movements SET deleted_at=now(),deleted_by=$1,updated_at=now() WHERE id=$2', [req.session.user.id, cash.id]);
    await syncStatus(c, exp.id, exp.total_cents);
    await audit(c, req, u.id, 'delete', 'expense_payment', pay.id, { ...pay, bank_movement_id: bank?.id || null, cash_movement_id: cash?.id || null }, null, reasonOf(req));
    return { ok: true, status: exp.status === 'paid' ? 'open' : exp.status };
  })));

  // ---------- Movimentos de caixa ----------
  async function loadCash(c, u, movementId) {
    const m = (await c.query('SELECT m.*,s.closed_at session_closed FROM cash_movements m LEFT JOIN cash_sessions s ON s.id=m.session_id WHERE m.id=$1 AND m.unit_id=$2 FOR UPDATE OF m', [movementId, u.id])).rows[0];
    if (!m) return { none: true };
    if (!['inflow', 'outflow'].includes(m.movement_type)) return { error: 'A abertura do caixa não pode ser alterada por aqui.' };
    if (m.expense_id) return { error: 'Este movimento é de um pagamento de despesa. Altere ou exclua o pagamento em Despesas e notas.' };
    const linked = (await c.query("SELECT * FROM bank_movements WHERE cash_movement_id=$1 FOR UPDATE", [m.id])).rows;
    if (linked.some(x => x.kind !== 'receipt')) return { error: 'Este movimento é um depósito ou saque. Estorne pela tela de Bancos.' };
    return { m, receipt: linked[0] || null };
  }
  async function dropReceipt(c, receipt) {
    if (!receipt) return null;
    const rev = await c.query('SELECT 1 FROM bank_movements WHERE reverses_id=$1', [receipt.id]);
    if (rev.rowCount || receipt.reversed_at) return { error: 'O recebimento no banco ligado a este movimento foi estornado. Não dá para alterar o movimento.' };
    await c.query('DELETE FROM bank_movements WHERE id=$1', [receipt.id]); return null;
  }
  async function makeReceipt(c, u, req, m, methodRow, day) {
    if (!methodRow.bank_account_id || m.movement_type !== 'inflow') return null;
    const acc = (await c.query('SELECT id,name,active,opening_date::text od FROM bank_accounts WHERE id=$1 AND unit_id=$2', [methodRow.bank_account_id, u.id])).rows[0];
    if (!acc || !acc.active) throw userError(`A conta do banco de "${methodRow.name}" está inativa. Escolha outro banco para essa forma de pagamento.`);
    if (day < acc.od) throw userError(`A conta ${acc.name} começa em ${brDate(acc.od)}, depois da data deste movimento.`);
    await c.query("INSERT INTO bank_movements(id,unit_id,account_id,occurred_on,direction,kind,amount_cents,category,description,cash_movement_id,created_by) VALUES($1,$2,$3,$4,'in','receipt',$5,$6,$7,$8,$9)", [id(), u.id, acc.id, day, m.amount_cents, `Recebimento de ${methodRow.name}`.slice(0, 100), String(m.description).slice(0, 250), m.id, req.session.user.id]);
    return null;
  }
  app.locals.makeCashReceipt = makeReceipt;
  app.patch('/api/cash/movements/:id', run((req, res, u) => inTx(async c => {
    const ctx = await loadCash(c, u, req.params.id); if (ctx.none) return null; if (ctx.error) return ctx;
    const { m, receipt } = ctx, b = req.body || {};
    if (m.deleted_at) return { error: 'Este movimento foi excluído. Restaure antes de editar.' };
    if (m.session_closed) return { error: 'O caixa deste movimento já foi fechado. Registre um novo movimento para corrigir.' };
    const day = b.occurred_on === undefined ? dateText(new Date(new Date(m.occurred_at).getTime() - 3 * 3600e3).toISOString()) : b.occurred_on;
    const gross = b.amount === undefined ? Number(m.gross_amount_cents ?? m.amount_cents) : parseMoney(b.amount);
    const methodRow = (await c.query('SELECT id,name,fee_applicable,bank_account_id FROM payment_methods WHERE unit_id=$1 AND active AND (id=$2 OR lower(name)=lower($2))', [u.id, text(b.payment_method === undefined ? m.payment_method : b.payment_method, 80)])).rows[0];
    const rateText = String(b.fee_percent === undefined ? m.fee_percent : b.fee_percent).trim().replace(',', '.'), rate = rateText === '' ? 0 : Number(rateText);
    const category = text(b.category === undefined ? m.category : b.category, 100), description = text(b.description === undefined ? m.description : b.description, 250), responsible = text(b.responsible === undefined ? m.responsible : b.responsible, 160);
    if (!validDate(day) || gross === null || gross <= 0 || !methodRow || !category || !description || !responsible || !Number.isFinite(rate) || rate < 0 || rate > 100) return { error: 'Informe data, valor, meio de pagamento, categoria, descrição, responsável e taxa válida entre 0 e 100%.', status: 400 };
    if (day > localToday()) return { error: 'A data do movimento não pode estar no futuro.', status: 400 };
    if (rate > 0 && (m.movement_type !== 'inflow' || !methodRow.fee_applicable)) return { error: 'Taxa da maquininha pode ser informada somente em recebimentos com meio configurado para taxa.', status: 400 };
    const fee = rate ? Number((BigInt(gross) * BigInt(Math.round(rate * 10000)) + 500000n) / 1000000n) : 0; if (fee > gross) return { error: 'A taxa não pode ser maior que o valor recebido.', status: 400 };
    let sessionId = null;
    if (day === localToday()) { const open = (await c.query('SELECT id FROM cash_sessions WHERE unit_id=$1 AND closed_at IS NULL ORDER BY opened_at DESC LIMIT 1', [u.id])).rows[0]; if (!open) return { error: 'Abra um turno antes de movimentar o caixa de hoje.' }; sessionId = open.id; }
    const drop = await dropReceipt(c, receipt); if (drop) return drop;
    const drawer = !(methodRow.bank_account_id && m.movement_type === 'inflow');
    const row = (await c.query('UPDATE cash_movements SET session_id=$1,occurred_at=$2,amount_cents=$3,gross_amount_cents=$4,fee_percent=$5,fee_cents=$6,category=$7,description=$8,payment_method=$9,responsible=$10,notes=$11,affects_drawer=$12,updated_at=now() WHERE id=$13 RETURNING *',
      [sessionId, `${day}${DAY}`, gross - fee, gross, rate, fee, category, description, methodRow.name, responsible, b.notes === undefined ? m.notes : text(b.notes, 1000) || null, drawer, m.id])).rows[0];
    await makeReceipt(c, u, req, row, methodRow, day);
    const details=cashDetails(b);await saveDetails(c,'cash_movements',u.id,m.id,details);Object.assign(row,details);
    await audit(c, req, u.id, 'update', 'cash_movement', m.id, m, row, reasonOf(req)); return row;
  })));
  app.delete('/api/cash/movements/:id', run((req, res, u) => inTx(async c => {
    const ctx = await loadCash(c, u, req.params.id); if (ctx.none) return null; if (ctx.error) return ctx;
    const { m, receipt } = ctx;
    if (m.deleted_at) return { error: 'Este movimento já foi excluído.' };
    if (m.session_closed) return { error: 'O caixa deste movimento já foi fechado. Registre um novo movimento para corrigir.' };
    const drop = await dropReceipt(c, receipt); if (drop) return drop;
    const row = (await c.query('UPDATE cash_movements SET deleted_at=now(),deleted_by=$1,updated_at=now() WHERE id=$2 RETURNING *', [req.session.user.id, m.id])).rows[0];
    await audit(c, req, u.id, 'delete', 'cash_movement', m.id, { ...m, bank_receipt_id: receipt?.id || null }, row, reasonOf(req)); return row;
  })));
  app.post('/api/cash/movements/:id/restore', run((req, res, u) => inTx(async c => {
    const ctx = await loadCash(c, u, req.params.id); if (ctx.none) return null; if (ctx.error) return ctx;
    const { m } = ctx;
    if (!m.deleted_at) return { error: 'Este movimento não está excluído.' };
    if (m.session_closed) return { error: 'O caixa deste movimento já foi fechado. Registre um novo movimento.' };
    const methodRow = (await c.query('SELECT id,name,fee_applicable,bank_account_id FROM payment_methods WHERE unit_id=$1 AND lower(name)=lower($2)', [u.id, m.payment_method || ''])).rows[0];
    const row = (await c.query('UPDATE cash_movements SET deleted_at=NULL,deleted_by=NULL,updated_at=now() WHERE id=$1 RETURNING *', [m.id])).rows[0];
    if (!row.affects_drawer && methodRow) { const day = (await c.query("SELECT (occurred_at AT TIME ZONE 'America/Sao_Paulo')::date::text d FROM cash_movements WHERE id=$1", [m.id])).rows[0].d; await makeReceipt(c, u, req, row, methodRow, day); }
    await audit(c, req, u.id, 'restore', 'cash_movement', m.id, m, row, reasonOf(req)); return row;
  })));

  // ---------- Movimentos bancários (excluir = estornar, já existente) ----------
  app.patch('/api/bank/movements/:id', run((req, res, u) => inTx(async c => {
    const m = (await c.query('SELECT b.*,a.opening_date::text acc_opening FROM bank_movements b JOIN bank_accounts a ON a.id=b.account_id WHERE b.id=$1 AND b.unit_id=$2 FOR UPDATE OF b', [req.params.id, u.id])).rows[0]; if (!m) return null;
    if (m.reverses_id || m.reversed_at) return { error: 'Lançamentos estornados e estornos não podem ser editados.' };
    if (m.cash_movement_id) return { error: 'Este lançamento nasceu de um movimento de caixa. Edite o movimento em Caixa da loja.' };
    if (m.expense_payment_id) return { error: 'Este lançamento é de um pagamento de despesa. Edite o pagamento em Despesas e notas.' };
    const b = req.body || {}, day = b.occurred_on === undefined ? dateText(m.occurred_on) : b.occurred_on;
    if (!validDate(day) || day > localToday()) return { error: 'Informe uma data válida que não esteja no futuro.', status: 400 };
    if (day < m.acc_opening) return { error: 'A data não pode ser anterior ao saldo inicial da conta.' };
    if (m.transfer_id && day !== dateText(m.occurred_on)) return { error: 'A data de uma transferência não pode ser alterada. Estorne e lance de novo.' };
    const category = text(b.category === undefined ? m.category : b.category, 100) || m.category, description = text(b.description === undefined ? m.description : b.description, 250);
    if (!description) return { error: 'Informe a descrição.', status: 400 };
    const row = (await c.query('UPDATE bank_movements SET occurred_on=$1,category=$2,description=$3,notes=$4,updated_at=now() WHERE id=$5 RETURNING *', [day, category, description, b.notes === undefined ? m.notes : text(b.notes, 1000) || null, m.id])).rows[0];
    await audit(c, req, u.id, 'update', 'bank_movement', m.id, m, row, reasonOf(req)); return row;
  })));
};
