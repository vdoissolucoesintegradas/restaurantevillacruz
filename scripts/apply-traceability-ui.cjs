const fs=require('node:fs');
function edit(file,fn){let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');const r=(a,b)=>{if(!s.includes(a))throw Error(`${file}: ${a.slice(0,90)}`);s=s.replace(a,b);};fn(r);fs.writeFileSync(file,s);}
edit('server.js',r=>{
 r("registerTraceability(app,{pool,routeUnit,fail});", "registerTraceability(app,{pool,routeUnit,fail});\nrequire('./reconciliation')(app,{pool,routeUnit,fail,inTx,id,audit,parseMoney,validDate,localToday,text});");
 r("movement_type,quantity,reason,reference,created_by) VALUES($1,$2,$3,$4,'adjustment',$5,'Contagem guiada', $6,$7)","movement_type,quantity,reason,reference,created_by,balance_delta) VALUES($1,$2,$3,$4,'adjustment',$5,'Contagem guiada', $6,$7,$8)");
 r("allocation.quantity,countId,req.session.user.id]);","allocation.quantity,countId,req.session.user.id,Math.sign(plan.difference_quantity)*allocation.quantity]);");
 r("await inTx(async c=>{await c.query(`INSERT INTO stock_lots", "await inTx(async c=>{await c.query('SELECT id FROM products WHERE id=$1 AND unit_id=$2 FOR UPDATE',[req.params.id,u.id]);await c.query(`INSERT INTO stock_lots");
});
edit('reconciliation.js',r=>r("SELECT * FROM bank_accounts WHERE id=$1", "SELECT *,opening_date::text opening_date FROM bank_accounts WHERE id=$1"));
edit('permissions.js',r=>{
 r("const MODULES = [", "const MODULES = [\n  ['reconciliation','Conferência', [['reconciliation.view','Consultar conferências e pendências',[A,O,F,U]],['reconciliation.manage','Registrar conferência bancária',[A,O,F]]]],");
 r("const RULES = [", "const RULES = [\n  ['GET','/api/reconciliation','reconciliation.view'], ['POST','/api/reconciliation','reconciliation.manage'],");
});
edit('public/app.js',r=>{
 r("const pageLabels = {", "const pageLabels = {reconciliation:'Conferência',");
 r("const pageSections = {", "const pageSections = {reconciliation:'Análises',");
 r("const navPermission = {", "const navPermission = {reconciliation:'reconciliation.view',");
 r("const labels={overview:", "const labels={reconciliation:'Conferência',overview:");
 r("textContent=({overview:", "textContent=({reconciliation:'Conferência',overview:");
 r("await ({overview:renderOverview", "await ({reconciliation:renderReconciliation,overview:renderOverview");
 r('class="form-grid"><label class="form-span-2">Nome do produto', 'class="form-grid trace-form"><div class="form-section-title">Identificação</div><label class="form-span-2">Nome do produto');
 r("${productSelect('Tipo de item'", "<label>Código de barras<input name=\"barcode\" maxlength=\"64\" value=\"${esc(p?.barcode||'')}\" placeholder=\"Identificador da embalagem\"></label><label>Marca / fabricante<input name=\"brand\" maxlength=\"120\" value=\"${esc(p?.brand||'')}\"></label>${productSelect('Tipo de item'");
 r("${productSelect('Unidade-base'", "<div class=\"form-section-title\">Compra e controle de estoque</div>${productSelect('Unidade-base'");
 r('<label class="form-span-2">Descrição e observações', '<div class="form-section-title">Armazenamento e orientações</div><label>Local de armazenamento<input name="storage_location" maxlength="160" value="${esc(p?.storage_location||\'\')}" placeholder="Ex.: câmara fria · prateleira 2"></label><label>Condições de conservação<input name="storage_conditions" maxlength="300" value="${esc(p?.storage_conditions||\'\')}" placeholder="Conforme orientação do fabricante"></label><label class="form-span-2">Descrição e observações');
 r('<label class="form-span-2">Observações<input name="notes" maxlength="1000"', '<label>Origem / destinatário<input name="counterparty" maxlength="160" placeholder="Quem entregou ou recebeu o valor"></label><label>Documento de origem<input name="source_document" maxlength="120" placeholder="Recibo, nota ou referência do repasse"></label><label class="form-span-2">Observações<input name="notes" maxlength="1000"');
 r("category:m.category,responsible:m.responsible,description:m.description,notes:m.notes", "category:m.category,responsible:m.responsible,description:m.description,notes:m.notes,counterparty:m.counterparty,source_document:mode==='copy'?'':m.source_document");
 r("esc(m.responsible || '—') + '</td>'", "esc(m.responsible || '—') + '<div><button class=\"button secondary small\" data-action=\"cash-history\" data-id=\"'+esc(m.id)+'\">Rastrear</button></div></td>'");
 r('data-action="view-lots" data-id="${esc(p.id)}"', 'data-action="product-history" data-id="${esc(p.id)}">Rastrear</button> <button class="button secondary small" data-action="view-lots" data-id="${esc(p.id)}"');
 r("movements.slice(0,8).map", "movements.slice(0,30).map");
 r("<td>${esc(m.reason||'—')}</td></tr>", "<td>${esc(m.reason||'—')}<div class=\"muted\">${esc(m.reference||m.source_document||'Sem referência')}</div></td><td>${esc(m.lot_code||m.lot_id||'Sem lote')}</td><td>${esc(m.operator_name||'Não identificado')}</td></tr>");
 r("rowEmpty(5,'Sem movimentações de estoque.')", "rowEmpty(7,'Sem movimentações de estoque.')");
 r("table(['Data','Produto','Tipo','Quantidade','Motivo'],moves)", "table(['Data','Produto','Tipo','Quantidade','Motivo / referência','Lote','Operador'],moves)");
 r("if(action.dataset.action==='move-product'){openModal", "if(action.dataset.action==='product-history'){await showProductHistory(action.dataset.id);return;}\n      if(action.dataset.action==='cash-history'){await showCashHistory(action.dataset.id);return;}\n      if(action.dataset.action==='move-product'){const lots=await api(`/api/products/${action.dataset.id}/lots?unit_id=${state.unit.id}`);openModal");
 r('<label>Tipo<select name="movement_type"><option value="consumption">', '<label class="form-span-2">Lote de origem<select name="lot_id"><option value="">Automático: primeiro a vencer (FEFO)</option>${lots.filter(l=>Number(l.quantity_remaining)>0).map(l=>`<option value="${esc(l.id)}">${esc(l.lot_code||l.id)} · saldo ${esc(l.quantity_remaining)} · validade ${dateBR(l.expires_on)}</option>`).join(\'\')}</select><span class="hint">O lote usado ficará no histórico. Para aumentar saldo, será criado um lote de ajuste.</span></label><label>Tipo<select name="movement_type"><option value="consumption">');
 r("else if(form.id==='product-form')", "else if(form.id==='reconciliation-form'){await post('/api/reconciliation?unit_id='+state.unit.id,data);closeModal(form);toast('Conferência registrada sem alterar o saldo.');await renderReconciliation();}\n      else if(form.id==='product-form')");
});
edit('public/index.html',r=>{
 r('data-page="dre"', 'data-page="dre"');
 r('<button class="nav-item" data-page="dre"', '<button class="nav-item" data-page="reconciliation"><span class="nav-icon">✓</span><span class="nav-text">Conferência</span></button>\n          <button class="nav-item" data-page="dre"');
});
