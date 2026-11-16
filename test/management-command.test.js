const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const migration = name => fs.readFile(path.join(__dirname, '..', 'migrations', name), 'utf8');

test('central de pendências deduplica por origem e fechamento diário preserva uma fotografia por data', async () => {
  const db = new PGlite();
  try {
    await db.exec(await migration('001-initial.sql'));
    await db.exec(await migration('021-management-command-center.sql'));
    await db.query("INSERT INTO business_units(id,name) VALUES('unit-1','Villa Cruz')");
    await db.query("INSERT INTO users(id,name,email,password_hash,role) VALUES('user-1','Ana','ana@example.com','hash','owner')");
    const fields = ['pending-1', 'unit-1', 'missing-sales:2026-11-15', 'missing_sales', 'high', 'Faturamento ausente', 'Dado ausente, não zero.', 'sales', 'business_date', '2026-11-15', '2026-11-15'];
    await db.query(`INSERT INTO management_pending_items(id,unit_id,dedupe_key,item_type,severity,title,detail,origin_page,reference_type,reference_id,due_on)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, fields);
    await assert.rejects(db.query(`INSERT INTO management_pending_items(id,unit_id,dedupe_key,item_type,severity,title,detail,origin_page)
      VALUES('pending-2','unit-1','missing-sales:2026-11-15','missing_sales','high','Repetida','Repetida','sales')`));
    await db.query(`INSERT INTO management_pending_events(id,pending_id,event_type,to_status,note,created_by)
      VALUES('event-1','pending-1','opened','open','Detectada pelo sistema.','user-1')`);
    await db.query(`INSERT INTO daily_management_closures(id,unit_id,business_date,status,reason,snapshot,closed_by,closed_at)
      VALUES('close-1','unit-1','2026-11-15','closed_with_reservation','Faturamento ainda em conferência.',$1::jsonb,'user-1',now())`, [JSON.stringify({ sales: { entries: 0 }, open_cash: null })]);
    const result = await db.query("SELECT status,snapshot->'sales'->>'entries' sales_entries FROM daily_management_closures WHERE unit_id='unit-1' AND business_date='2026-11-15'");
    assert.deepEqual(result.rows, [{ status: 'closed_with_reservation', sales_entries: '0' }]);
  } finally {
    await db.close();
  }
});
