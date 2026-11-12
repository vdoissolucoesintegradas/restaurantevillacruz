'use strict';
module.exports=function registerReconciliation(app,{pool,routeUnit,fail,inTx,id,audit,parseMoney,validDate,localToday,text}){
  app.get('/api/reconciliation',async(req,res,next)=>{
    try{
      const u=await routeUnit(req,res);if(!u)return;
      const [accounts,checks,quality]=await Promise.all([
        pool.query('SELECT id,name,opening_date,active FROM bank_accounts WHERE unit_id=$1 ORDER BY name',[u.id]),
        pool.query(`SELECT r.*,a.name account_name,u.name operator_name,
          (a.opening_cents+COALESCE((SELECT SUM(CASE WHEN m.direction='in' THEN m.amount_cents ELSE -m.amount_cents END) FROM bank_movements m WHERE m.account_id=a.id AND m.unit_id=r.unit_id AND m.occurred_on<=r.as_of),0))::text current_ledger_cents
          FROM bank_reconciliations r JOIN bank_accounts a ON a.id=r.account_id LEFT JOIN users u ON u.id=r.created_by
          WHERE r.unit_id=$1 ORDER BY r.created_at DESC LIMIT 100`,[u.id]),
        pool.query(`SELECT
          (SELECT count(*)::int FROM cash_sessions WHERE unit_id=$1 AND closed_at IS NOT NULL AND (COALESCE(difference_cents,0)<>0 OR COALESCE(opening_difference_cents,0)<>0)) cash_differences,
          (SELECT count(*)::int FROM stock_lots WHERE unit_id=$1 AND (source_document IS NULL OR supplier IS NULL OR lot_code IS NULL)) incomplete_lots,
          (SELECT count(*)::int FROM stock_movements WHERE unit_id=$1 AND balance_delta IS NULL) unknown_stock_direction,
          (SELECT count(*)::int FROM expenses e LEFT JOIN categories c ON c.id=e.category_id WHERE e.unit_id=$1 AND e.status IN ('open','paid') AND c.dre_group IS NULL) unclassified_expenses`,[u.id])
      ]);
      res.json({accounts:accounts.rows,checks:checks.rows,quality:quality.rows[0],limit:100});
    }catch(e){next(e);}
  });
  app.post('/api/reconciliation',async(req,res,next)=>{
    try{
      const u=await routeUnit(req,res);if(!u)return;const b=req.body;
      const observed=parseMoney(b.observed_balance),date=b.as_of,source=text(b.source_document,120),notes=text(b.notes,1000)||null;
      if(observed===null||!validDate(date)||date>localToday()||!source)return fail(res,400,'Informe data até hoje, saldo do extrato e documento de conferência.');
      const result=await inTx(async c=>{
        const account=(await c.query('SELECT *,opening_date::text opening_date FROM bank_accounts WHERE id=$1 AND unit_id=$2 FOR UPDATE',[b.account_id,u.id])).rows[0];
        if(!account)return {status:404,error:'Conta não encontrada nesta unidade.'};
        if(date<String(account.opening_date).slice(0,10))return {status:400,error:'A data deve ser igual ou posterior ao saldo inicial da conta.'};
        const movements=await c.query("SELECT COALESCE(sum(CASE WHEN direction='in' THEN amount_cents ELSE -amount_cents END),0)::text amount FROM bank_movements WHERE account_id=$1 AND unit_id=$2 AND occurred_on<=$3",[account.id,u.id,date]);
        const ledger=BigInt(account.opening_cents)+BigInt(movements.rows[0].amount),diff=BigInt(observed)-ledger;
        if(diff!==0n&&!notes)return {status:400,error:'Explique a divergência ou informe o que ainda precisa ser investigado.'};
        const row={id:id(),unit_id:u.id,account_id:account.id,as_of:date,observed_cents:String(observed),ledger_cents:String(ledger),difference_cents:String(diff),source_document:source,notes,created_by:req.session.user.id};
        await c.query('INSERT INTO bank_reconciliations(id,unit_id,account_id,as_of,observed_cents,ledger_cents,difference_cents,source_document,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',Object.values(row));
        await audit(c,req,u.id,'reconcile','bank_account',account.id,null,row,notes);return row;
      });
      if(result.error)return fail(res,result.status||400,result.error);res.status(201).json(result);
    }catch(e){next(e);}
  });
};
