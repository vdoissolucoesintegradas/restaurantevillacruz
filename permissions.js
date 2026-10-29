'use strict';
// Permissões por usuário. O perfil define o padrão; o administrador pode ajustar cada usuário.
// "roles" de cada chave reproduz exatamente o que as rotas liberavam antes de existirem permissões por usuário.
const A = 'admin', O = 'owner', F = 'finance', P = 'operations', U = 'auditor';
const ALL = [A, O, F, P, U];

// [módulo, rótulo na tela, [[chave, rótulo, perfis com a chave por padrão], ...]]
const MODULES = [
  ['overview', 'Visão geral', [['overview.view', 'Ver painel e checklist', ALL], ['tasks.manage', 'Adicionar e concluir tarefas', [A, O, F, P]]]],
  ['sales', 'Faturamento e CMV', [['sales.view', 'Ver', ALL], ['sales.create', 'Lançar', [A, O, F, P]], ['sales.edit', 'Editar', [A, O, F]], ['sales.delete', 'Excluir e restaurar', [A, O, F]]]],
  ['expenses', 'Despesas e notas', [['expenses.view', 'Ver', [A, O, F, U]], ['expenses.create', 'Registrar e gerar recorrências', [A, O, F]], ['expenses.edit', 'Editar', [A, O, F]], ['expenses.delete', 'Excluir e restaurar', [A, O, F]], ['expenses.pay', 'Registrar, editar e excluir pagamentos', [A, O, F]]]],
  ['cash', 'Caixa da loja', [['cash.view', 'Ver', ALL], ['cash.analyze', 'Ver diferenças e previsão', [A, O, F, U]], ['cash.move', 'Lançar movimentos', [A, O, F, P]], ['cash.shift', 'Abrir e fechar caixa', [A, O, F]], ['cash.edit', 'Editar movimentos', [A, O, F]], ['cash.delete', 'Excluir e restaurar movimentos', [A, O, F]]]],
  ['banks', 'Bancos e fluxo financeiro', [['banks.view', 'Ver', [A, O, F, U]], ['banks.move', 'Depositar, sacar, transferir e receber', [A, O, F]], ['banks.edit', 'Editar lançamentos', [A, O, F]], ['banks.delete', 'Excluir (estornar) lançamentos', [A, O, F]], ['banks.manage', 'Gerir contas e o banco de cada forma de pagamento', [A, O]]]],
  ['inventory', 'Estoque', [['inventory.view', 'Ver', ALL], ['inventory.create', 'Cadastrar, receber e movimentar', [A, O, F, P]], ['inventory.edit', 'Editar produtos', [A, O, F, P]]]],
  ['suppliers', 'Fornecedores', [['suppliers.view', 'Ver', ALL], ['suppliers.create', 'Cadastrar', [A, O, F, P]]]],
  ['purchases', 'Pedidos de compra', [['purchases.view', 'Ver', [A, O, F, P, U]], ['purchases.create', 'Criar pedidos', [A, O, F, P]], ['purchases.receive', 'Registrar recebimentos', [A, O, F, P]]]],
  ['dre', 'DRE', [['dre.view', 'Ver', [A, O, F, U]]]],
  ['reports', 'Relatórios', [['reports.view', 'Ver', [A, O, F, U]], ['reports.manage', 'Orçamento e fechamento de mês', [A, O, F]], ['reports.save', 'Salvar consultas', [A, O, F, P]], ['reports.reopen', 'Reabrir mês fechado', [A, O]]]],
  ['import', 'Importar Excel', [['import.use', 'Importar planilhas e carga histórica', [A, O, F]]]],
  ['attachments', 'Documentos', [['attachments.view', 'Ver', [A, O, F, U]], ['attachments.upload', 'Anexar', [A, O, F, P]]]],
  ['audit', 'Auditoria', [['audit.view', 'Ver', [A, O, U]]]],
  ['settings', 'Configurações', [['settings.manage', 'Alterar configurações, categorias e formas de pagamento', [A, O]]]]
];

const PERMISSIONS = {};
for (const [module, , items] of MODULES) for (const [key, label, roles] of items) PERMISSIONS[key] = { module, label, roles };
const KEYS = Object.keys(PERMISSIONS);

// [método, caminho, chave]. Rotas que não aparecem aqui seguem apenas o allow(...) do servidor.
const RULES = [
  ['GET', '/api/dashboard', 'overview.view'], ['GET', '/api/operations/tasks', 'overview.view'],
  ['POST', '/api/operations/tasks', 'tasks.manage'], ['POST', '/api/operations/tasks/:id', 'tasks.manage'],
  ['GET', '/api/sales', 'sales.view'], ['GET', '/api/sales/comparison', 'sales.view'], ['GET', '/api/reports/sales.csv', 'sales.view'],
  ['POST', '/api/sales', 'sales.create'], ['PATCH', '/api/sales/:id', 'sales.edit'], ['DELETE', '/api/sales/:id', 'sales.delete'], ['POST', '/api/sales/:id/restore', 'sales.delete'],
  ['POST', '/api/categories', 'inventory.create'], ['POST', '/api/catalog/options', 'inventory.create'],
  ['GET', '/api/suppliers', 'suppliers.view'], ['POST', '/api/suppliers', 'suppliers.create'],
  ['GET', '/api/products', 'inventory.view'], ['GET', '/api/products/:id/lots', 'inventory.view'], ['GET', '/api/stock/cost-history', 'inventory.view'], ['GET', '/api/stock/movements', 'inventory.view'], ['GET', '/api/reports/stock.csv', 'inventory.view'],
  ['POST', '/api/products', 'inventory.create'], ['POST', '/api/products/:id/lots', 'inventory.create'], ['POST', '/api/stock/movements', 'inventory.create'], ['POST', '/api/stock/counts', 'inventory.create'],
  ['PUT', '/api/products/:id', 'inventory.edit'],
  ['GET', '/api/expenses', 'expenses.view'], ['GET', '/api/expenses/recurrences', 'expenses.view'], ['GET', '/api/reports/expenses.csv', 'expenses.view'],
  ['POST', '/api/expenses', 'expenses.create'], ['POST', '/api/expenses/recurrences', 'expenses.create'], ['POST', '/api/expenses/recurrences/:id/draft', 'expenses.create'], ['POST', '/api/expenses/:id/review', 'expenses.create'],
  ['PATCH', '/api/expenses/:id', 'expenses.edit'], ['DELETE', '/api/expenses/:id', 'expenses.delete'], ['POST', '/api/expenses/:id/restore', 'expenses.delete'],
  ['POST', '/api/expenses/:id/payments', 'expenses.pay'], ['PATCH', '/api/expenses/:id/payments/:paymentId', 'expenses.pay'], ['DELETE', '/api/expenses/:id/payments/:paymentId', 'expenses.pay'],
  ['GET', '/api/purchase-orders', 'purchases.view'], ['GET', '/api/suppliers/performance', 'purchases.view'],
  ['POST', '/api/purchase-orders', 'purchases.create'], ['POST', '/api/purchase-orders/:id/receive', 'purchases.receive'],
  ['POST', '/api/payment-methods', 'settings.manage'], ['PATCH', '/api/payment-methods/:id', 'settings.manage'],
  ['GET', '/api/cash', 'cash.view'], ['GET', '/api/cash/discrepancies', 'cash.analyze'], ['GET', '/api/cash/forecast', 'cash.analyze'], ['GET', '/api/reports/cash.csv', 'cash.analyze'],
  ['POST', '/api/settings/cash-discrepancy-alerts', 'settings.manage'],
  ['POST', '/api/cash/open', 'cash.shift'], ['POST', '/api/cash/close', 'cash.shift'], ['POST', '/api/cash/movements', 'cash.move'],
  ['PATCH', '/api/cash/movements/:id', 'cash.edit'], ['DELETE', '/api/cash/movements/:id', 'cash.delete'], ['POST', '/api/cash/movements/:id/restore', 'cash.delete'],
  ['GET', '/api/bank/accounts', 'banks.view'], ['GET', '/api/bank/flow', 'banks.view'],
  ['POST', '/api/bank/accounts', 'banks.manage'], ['PATCH', '/api/bank/accounts/:id', 'banks.manage'],
  ['POST', '/api/bank/movements', 'banks.move'], ['PATCH', '/api/bank/movements/:id', 'banks.edit'], ['POST', '/api/bank/movements/:id/reverse', 'banks.delete'],
  ['GET', '/api/dre', 'dre.view'], ['GET', '/api/reports/dre.csv', 'dre.view'],
  ['GET', '/api/reports/run', 'reports.view'], ['GET', '/api/reports/run.csv', 'reports.view'], ['GET', '/api/reports/saved', 'reports.view'], ['GET', '/api/budgets', 'reports.view'], ['GET', '/api/period-closures', 'reports.view'],
  ['POST', '/api/budgets', 'reports.manage'], ['POST', '/api/period-closures', 'reports.manage'], ['POST', '/api/reports/saved', 'reports.save'], ['POST', '/api/period-closures/:month/reopen', 'reports.reopen'],
  ['GET', '/api/audit', 'audit.view'], ['GET', '/api/audit/users', 'audit.view'], ['GET', '/api/products/audit', 'audit.view'],
  ['POST', '/api/settings', 'settings.manage'], ['POST', '/api/settings/supplier-form-fields', 'settings.manage'], ['POST', '/api/settings/login-logo', 'settings.manage'], ['DELETE', '/api/settings/login-logo', 'settings.manage'],
  ['POST', '/api/import/preview', 'import.use'], ['POST', '/api/import/legacy/preview', 'import.use'], ['POST', '/api/import/legacy/commit', 'import.use'], ['GET', '/api/import/batches', 'import.use'], ['POST', '/api/import/:id/reconcile', 'import.use'], ['POST', '/api/import/:id/commit', 'import.use'],
  ['POST', '/api/attachments', 'attachments.upload'], ['GET', '/api/attachments', 'attachments.view']
];
const COMPILED = RULES.map(([method, path, key]) => ({ method, key, re: new RegExp('^' + path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:[A-Za-z]+/g, '[^/]+') + '/?$') }));

function permissionFor(method, fullPath) {
  const m = String(method || '').toUpperCase();
  for (const r of COMPILED) if (r.method === m && r.re.test(fullPath)) return r.key;
  return null;
}
const defaultsFor = role => KEYS.filter(k => PERMISSIONS[k].roles.includes(role));
// Administrador sempre tem tudo. Os demais usam a lista do usuário quando houver; senão, o padrão do perfil.
function effectivePermissions(role, stored) {
  if (role === 'admin') return new Set(KEYS);
  if (Array.isArray(stored)) return new Set(stored.filter(k => PERMISSIONS[k]));
  return new Set(defaultsFor(role));
}
// Valida a lista enviada pela tela. Se for igual ao padrão do perfil, guarda NULL (acompanha o perfil).
function normalizePermissions(input, role) {
  if (input === null || input === undefined || input === '') return null;
  const list = Array.isArray(input) ? input : String(input).split(',');
  const clean = [...new Set(list.map(String).filter(k => PERMISSIONS[k]))].sort();
  const base = defaultsFor(role).slice().sort();
  return clean.length === base.length && clean.every((k, i) => k === base[i]) ? null : clean;
}
function catalog() {
  return {
    modules: MODULES.map(([module, label, items]) => ({ module, label, items: items.map(([key, itemLabel]) => ({ key, label: itemLabel })) })),
    defaults: Object.fromEntries(['admin', 'owner', 'finance', 'operations', 'auditor'].map(r => [r, [...effectivePermissions(r, null)]]))
  };
}

module.exports = { PERMISSIONS, KEYS, RULES, permissionFor, effectivePermissions, normalizePermissions, defaultsFor, catalog };
