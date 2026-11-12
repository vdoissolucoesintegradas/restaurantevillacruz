'use strict';

function optionalText(value, max, label) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > max) {
    throw Object.assign(new Error(`${label}: use até ${max} caracteres.`), {status:400});
  }
  return value.trim() || null;
}
function productDetails(body) {
  const result = {};
  for (const [key,max,label] of [['barcode',64,'Código de barras'],['brand',120,'Marca'],['storage_location',160,'Local de armazenamento'],['storage_conditions',300,'Condições de conservação']]) {
    if (Object.hasOwn(body,key)) result[key] = optionalText(body[key],max,label);
  }
  return result;
}
function cashDetails(body) {
  const result = {};
  for (const [key,max,label] of [['source_document',120,'Documento de origem'],['counterparty',160,'Origem/destinatário']]) {
    if (Object.hasOwn(body,key)) result[key] = optionalText(body[key],max,label);
  }
  return result;
}
async function saveDetails(client, table, unitId, entityId, details) {
  const allowed = table === 'products' ? ['barcode','brand','storage_location','storage_conditions'] : table === 'cash_movements' ? ['source_document','counterparty'] : [];
  const keys = Object.keys(details).filter(key=>allowed.includes(key));
  if (!keys.length) return;
  await client.query(`UPDATE ${table} SET ${keys.map((key,i)=>`${key}=$${i+1}`).join(',')} WHERE id=$${keys.length+1} AND unit_id=$${keys.length+2}`, [...keys.map(key=>details[key]),entityId,unitId]);
}
function registerTraceability(app, {pool,routeUnit,fail}) {
  app.get('/api/products/:id/history', async(req,res,next)=>{
    try {
      const unit=await routeUnit(req,res); if(!unit)return;
      const product=(await pool.query('SELECT p.*,u.name created_by_name FROM products p LEFT JOIN users u ON u.id=p.created_by WHERE p.id=$1 AND p.unit_id=$2',[req.params.id,unit.id])).rows[0];
      if(!product)return fail(res,404,'Produto não encontrado.');
      const page=Math.max(0,Math.min(100000,Number.parseInt(req.query.page,10)||0)),size=50;
      const movements=await pool.query(`SELECT m.*,l.lot_code,l.source_document,l.supplier,l.received_on,l.expires_on,l.unit_cost_cents,u.name operator_name
        FROM stock_movements m LEFT JOIN stock_lots l ON l.id=m.lot_id AND l.unit_id=m.unit_id
        LEFT JOIN users u ON u.id=m.created_by WHERE m.unit_id=$1 AND m.product_id=$2
        ORDER BY m.created_at DESC,m.id DESC LIMIT $3 OFFSET $4`,[unit.id,product.id,size+1,page*size]);
      // Apenas alterações do cadastro deste produto; não expõe auditoria de outros domínios.
      const changes=await pool.query(`SELECT a.id,a.action,a.created_at,a.before_data,a.after_data,a.reason,u.name operator_name FROM audit_log a
        LEFT JOIN users u ON u.id=a.user_id WHERE a.unit_id=$1 AND a.entity_type='product' AND a.entity_id=$2
        ORDER BY a.created_at DESC,a.id DESC LIMIT 50`,[unit.id,product.id]);
      res.json({product,movements:movements.rows.slice(0,size),has_more:movements.rows.length>size,page,changes:changes.rows,changes_limit:50});
    }catch(e){next(e);}
  });
  app.get('/api/cash/movements/:id/history',async(req,res,next)=>{
    try {
      const unit=await routeUnit(req,res);if(!unit)return;
      const movement=(await pool.query(`SELECT m.*,u.name operator_name,s.shift_name,s.opened_at,s.closed_at FROM cash_movements m
        LEFT JOIN users u ON u.id=m.created_by LEFT JOIN cash_sessions s ON s.id=m.session_id
        WHERE m.id=$1 AND m.unit_id=$2`,[req.params.id,unit.id])).rows[0];
      if(!movement)return fail(res,404,'Movimento não encontrado.');
      const changes=await pool.query(`SELECT a.id,a.action,a.created_at,a.before_data,a.after_data,a.reason,u.name operator_name FROM audit_log a
        LEFT JOIN users u ON u.id=a.user_id WHERE a.unit_id=$1 AND a.entity_type='cash_movement' AND a.entity_id=$2
        ORDER BY a.created_at DESC,a.id DESC LIMIT 100`,[unit.id,movement.id]);
      res.json({movement,changes:changes.rows,changes_limit:100});
    }catch(e){next(e);}
  });
}
module.exports={productDetails,cashDetails,saveDetails,registerTraceability};
