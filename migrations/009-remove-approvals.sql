ALTER TABLE approval_requests DROP CONSTRAINT IF EXISTS approval_requests_status_check;
ALTER TABLE approval_requests ADD CONSTRAINT approval_requests_status_check CHECK (status IN ('pending','approved','rejected','cancelled'));

INSERT INTO audit_log(id,unit_id,user_id,action,entity_type,entity_id,reason,before_data,after_data)
SELECT 'approval-disabled-' || request.id,request.unit_id,NULL,'cancel','approval_request',request.id,'Fluxo de aprovação removido do sistema',to_jsonb(request),jsonb_set(to_jsonb(request),'{status}','"cancelled"'::jsonb,true)
FROM approval_requests request WHERE request.status='pending' ON CONFLICT(id) DO NOTHING;
UPDATE approval_requests SET status='cancelled',decision_reason='Fluxo de aprovação removido do sistema',decided_at=now() WHERE status='pending';

INSERT INTO audit_log(id,unit_id,user_id,action,entity_type,entity_id,reason,before_data,after_data)
SELECT 'approval-disabled-expense-' || expense.id,expense.unit_id,NULL,'update','expense',expense.id,'Lançamento liberado após remoção do fluxo de aprovação',to_jsonb(expense),jsonb_set(to_jsonb(expense),'{status}','"open"'::jsonb,true)
FROM expenses expense WHERE expense.status='review' ON CONFLICT(id) DO NOTHING;
UPDATE expenses SET status='open',updated_at=now() WHERE status='review';
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_status_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_status_check CHECK (status IN ('open','paid','cancelled'));
