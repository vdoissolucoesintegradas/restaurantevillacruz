const fs=require('node:fs');
function edit(file,fn){const original=fs.readFileSync(file,'utf8');let s=original.replace(/\r\n/g,'\n');const replace=(a,b)=>{if(!s.includes(a))throw Error(`${file}: missing ${a.slice(0,100)}`);s=s.replace(a,b);};fn(replace);fs.writeFileSync(file,s);}
edit('server.js',r=>{
 r("require('dotenv').config();","require('dotenv').config();\nconst {productDetails,cashDetails,saveDetails,registerTraceability}=require('./traceability');");
 r("const value = await fn(client); await client.query('COMMIT'); return value;", "const value = await fn(client); await client.query(value && value.error ? 'ROLLBACK' : 'COMMIT'); return value;");
 r("async function productFields(d,unitId){", "async function productFields(d,unitId){productDetails(d);");
 r("await audit(c,req,u.id,'create','product',row.id,null,row);", "const details=productDetails(req.body);await saveDetails(c,'products',u.id,row.id,details);Object.assign(row,details);await audit(c,req,u.id,'create','product',row.id,null,row);");
 r("const row={...parsed.row,updated_at:new Date().toISOString()};await inTx(async c=>{", "const row={...parsed.row,updated_at:new Date().toISOString()};await inTx(async c=>{await c.query('SELECT id FROM products WHERE id=$1 AND unit_id=$2 FOR UPDATE',[req.params.id,u.id]);if(old.rows[0].base_unit!==row.base_unit&&(await c.query('SELECT 1 FROM stock_lots WHERE product_id=$1 AND unit_id=$2 LIMIT 1',[req.params.id,u.id])).rowCount)throw Object.assign(new Error('A unidade-base não pode mudar depois de receber estoque. Cadastre outro produto para preservar o histórico.'),{status:409});");
 r("await audit(c,req,u.id,'update','product',req.params.id,old.rows[0],row);", "const details=productDetails(req.body);await saveDetails(c,'products',u.id,req.params.id,details);Object.assign(row,details);await audit(c,req,u.id,'update','product',req.params.id,old.rows[0],row);");
 r("if(!purchaseQty||packageCost", "if(d.expires_on&&validDate(d.expires_on)&&validDate(d.received_on)&&d.expires_on<d.received_on)return fail(res,400,'A validade não pode ser anterior ao recebimento.');if(!purchaseQty||packageCost");
 r("Object.values(lot));await c.query", "Object.values(lot));await c.query");
 r("[mid,u.id,d.product_id,item.lot_id,type,item.quantity,text(d.reason,300),text(d.reference,120)||null,req.session.user.id]);", "[mid,u.id,d.product_id,item.lot_id,type,item.quantity,text(d.reason,300),text(d.reference,120)||null,req.session.user.id]);if(type==='adjustment')await c.query('UPDATE stock_movements SET balance_delta=$1 WHERE id=$2',[direction==='increase'?item.quantity:-item.quantity,mid]);");
 r("reason:d.reason,lot_allocations:used", "reason:d.reason,reference:text(d.reference,120)||null,direction:type==='adjustment'?direction:'decrease',lot_allocations:used");
 r("SELECT m.*,p.name product_name,l.lot_code FROM stock_movements m JOIN products p ON p.id=m.product_id LEFT JOIN stock_lots l ON l.id=m.lot_id", "SELECT m.*,p.name product_name,l.lot_code,l.source_document,u.name operator_name FROM stock_movements m JOIN products p ON p.id=m.product_id LEFT JOIN stock_lots l ON l.id=m.lot_id LEFT JOIN users u ON u.id=m.created_by");
 r("await audit(c,req,u.id,'create','cash_movement',item.id,null,item);", "const details=cashDetails(d);await saveDetails(c,'cash_movements',u.id,item.id,details);Object.assign(item,details);await audit(c,req,u.id,'create','cash_movement',item.id,null,item);");
 r("app.get('/healthz'", "registerTraceability(app,{pool,routeUnit,fail});\napp.get('/healthz'");
 r("bootstrap().catch(e=>", "module.exports={app,pool,bootstrap,inTx,migrate};\nif(require.main===module)bootstrap().catch(e=>");
});
edit('entries.js',r=>{
 r("'use strict';", "'use strict';\nconst {cashDetails,saveDetails}=require('./traceability');");
 r("await makeReceipt(c, u, req, row, methodRow, day);\n    await audit", "await makeReceipt(c, u, req, row, methodRow, day);\n    const details=cashDetails(b);await saveDetails(c,'cash_movements',u.id,m.id,details);Object.assign(row,details);\n    await audit");
});
edit('permissions.js',r=>{
 r("const RULES = [", "const RULES = [\n  ['GET','/api/products/:id/history','inventory.view'], ['GET','/api/cash/movements/:id/history','cash.view'],");
});
