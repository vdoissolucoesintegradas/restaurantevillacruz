-- Villa Cruz foundation. Financial meanings remain configurable until workbook review.
create extension if not exists pgcrypto;

create type public.app_role as enum (
  'administrator', 'owner_manager', 'finance', 'operations_manager', 'auditor'
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  name text not null,
  code text not null,
  active boolean not null default true,
  unique (company_id, code)
);

-- Authorization is stored in database rows, never in user-editable auth metadata.
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  user_id uuid not null references auth.users(id),
  role public.app_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table public.module_permissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  role public.app_role not null,
  module text not null,
  action text not null,
  allowed boolean not null,
  updated_at timestamptz not null default now(),
  unique (company_id, role, module, action)
);

create table public.business_parameters (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  unit_id uuid references public.units(id),
  parameter_key text not null,
  value jsonb not null,
  valid_from date not null,
  valid_until date,
  confirmed boolean not null default false,
  change_reason text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from)
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  unit_id uuid references public.units(id),
  source_file_name text not null,
  source_file_sha256 text,
  source_sheet text,
  source_period text,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'confirmed', 'cancelled')),
  mapping jsonb not null default '{}'::jsonb,
  totals jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz
);

create table public.import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete restrict,
  source_row_number integer not null,
  source_values jsonb not null,
  interpreted_values jsonb not null default '{}'::jsonb,
  validation_state text not null default 'pending'
    check (validation_state in ('pending', 'accepted', 'warning', 'rejected')),
  messages jsonb not null default '[]'::jsonb,
  unique (batch_id, source_row_number)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  company_id uuid references public.companies(id),
  actor_id uuid references auth.users(id),
  action text not null,
  module text not null,
  record_type text,
  record_id text,
  reason text,
  old_values jsonb,
  new_values jsonb,
  source text not null default 'application',
  occurred_at timestamptz not null default now()
);

-- Trigger-only writer for audit events; private schema is not exposed through the Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create or replace function private.audit_import_batch_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events (
    company_id, actor_id, action, module, record_type, record_id, new_values, source
  ) values (
    new.company_id, auth.uid(), 'create', 'imports', 'import_batch', new.id::text,
    jsonb_build_object('source_file_name', new.source_file_name, 'source_sheet', new.source_sheet,
      'source_period', new.source_period, 'status', new.status), 'database-trigger'
  );
  return new;
end;
$$;
revoke all on function private.audit_import_batch_insert() from public, anon, authenticated;
create trigger audit_import_batch_insert
after insert on public.import_batches
for each row execute function private.audit_import_batch_insert();

create index memberships_user_company_idx on public.memberships(user_id, company_id) where active;
create index permissions_lookup_idx on public.module_permissions(company_id, role, module, action) where allowed;
create index parameters_vigency_idx on public.business_parameters(company_id, parameter_key, valid_from, valid_until);
create index imports_company_created_idx on public.import_batches(company_id, created_at desc);
create index audit_company_time_idx on public.audit_events(company_id, occurred_at desc);

alter table public.companies enable row level security;
alter table public.units enable row level security;
alter table public.memberships enable row level security;
alter table public.module_permissions enable row level security;
alter table public.business_parameters enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;
alter table public.audit_events enable row level security;

create policy "members read their companies" on public.companies
  for select to authenticated
  using (exists (
    select 1 from public.memberships m
    where m.company_id = companies.id and m.user_id = (select auth.uid()) and m.active
  ));

create policy "members read their units" on public.units
  for select to authenticated
  using (exists (
    select 1 from public.memberships m
    where m.company_id = units.company_id and m.user_id = (select auth.uid()) and m.active
  ));

create policy "members read own membership" on public.memberships
  for select to authenticated
  using (user_id = (select auth.uid()) and active);

create policy "members read company permissions" on public.module_permissions
  for select to authenticated
  using (exists (
    select 1 from public.memberships m
    where m.company_id = module_permissions.company_id
      and m.user_id = (select auth.uid()) and m.active
  ));

create policy "administrators require aal2 for permissions" on public.module_permissions
  as restrictive for select to authenticated
  using (
    (select auth.jwt()->>'aal') = 'aal2'
    or not exists (select 1 from public.memberships m where m.company_id = module_permissions.company_id
      and m.user_id = (select auth.uid()) and m.active and m.role = 'administrator')
  );

create policy "members read parameters" on public.business_parameters
  for select to authenticated
  using (exists (
    select 1 from public.memberships m
    where m.company_id = business_parameters.company_id
      and m.user_id = (select auth.uid()) and m.active
  ));

create policy "administrators require aal2 for parameters" on public.business_parameters
  as restrictive for select to authenticated
  using (
    (select auth.jwt()->>'aal') = 'aal2'
    or not exists (select 1 from public.memberships m where m.company_id = business_parameters.company_id
      and m.user_id = (select auth.uid()) and m.active and m.role = 'administrator')
  );

create policy "finance roles manage import batches" on public.import_batches
  for all to authenticated
  using (
    created_by = (select auth.uid()) and exists (
      select 1 from public.memberships m
      where m.company_id = import_batches.company_id
        and m.user_id = (select auth.uid()) and m.active
        and m.role in ('administrator', 'owner_manager', 'finance')
    )
  )
  with check (
    created_by = (select auth.uid()) and exists (
      select 1 from public.memberships m
      where m.company_id = import_batches.company_id
        and m.user_id = (select auth.uid()) and m.active
        and m.role in ('administrator', 'owner_manager', 'finance')
    )
  );

create policy "finance roles manage own import rows" on public.import_rows
  for all to authenticated
  using (exists (
    select 1 from public.import_batches b
    where b.id = import_rows.batch_id and b.created_by = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.import_batches b
    where b.id = import_rows.batch_id and b.created_by = (select auth.uid())
  ));

create policy "administrators require aal2 for import batches" on public.import_batches
  as restrictive for all to authenticated
  using (
    (select auth.jwt()->>'aal') = 'aal2'
    or not exists (
      select 1 from public.memberships m
      where m.company_id = import_batches.company_id and m.user_id = (select auth.uid())
        and m.active and m.role = 'administrator'
    )
  )
  with check (
    (select auth.jwt()->>'aal') = 'aal2'
    or not exists (
      select 1 from public.memberships m
      where m.company_id = import_batches.company_id and m.user_id = (select auth.uid())
        and m.active and m.role = 'administrator'
    )
  );

create policy "administrators require aal2 for import rows" on public.import_rows
  as restrictive for all to authenticated
  using (exists (
    select 1 from public.import_batches b
    where b.id = import_rows.batch_id
      and ((select auth.jwt()->>'aal') = 'aal2' or not exists (
        select 1 from public.memberships m where m.company_id = b.company_id
          and m.user_id = (select auth.uid()) and m.active and m.role = 'administrator'
      ))
  ))
  with check (exists (
    select 1 from public.import_batches b
    where b.id = import_rows.batch_id
      and ((select auth.jwt()->>'aal') = 'aal2' or not exists (
        select 1 from public.memberships m where m.company_id = b.company_id
          and m.user_id = (select auth.uid()) and m.active and m.role = 'administrator'
      ))
  ));

create policy "authorized users read audit" on public.audit_events
  for select to authenticated
  using (exists (
    select 1 from public.memberships m
    where m.company_id = audit_events.company_id
      and m.user_id = (select auth.uid()) and m.active
      and m.role in ('administrator', 'owner_manager', 'auditor')
  ));

create policy "administrators require aal2 for audit" on public.audit_events
  as restrictive for select to authenticated
  using (
    (select auth.jwt()->>'aal') = 'aal2'
    or not exists (select 1 from public.memberships m where m.company_id = audit_events.company_id
      and m.user_id = (select auth.uid()) and m.active and m.role = 'administrator')
  );

-- Users cannot edit membership, permissions, parameters, or audit events through the Data API.
revoke insert, update, delete, truncate, references, trigger on public.companies from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.units from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.memberships from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.module_permissions from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.business_parameters from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.audit_events from anon, authenticated;
revoke update, delete, truncate, references, trigger on public.import_batches from anon, authenticated;
revoke update, delete, truncate, references, trigger on public.import_rows from anon, authenticated;

grant select on public.companies, public.units, public.memberships, public.module_permissions,
  public.business_parameters, public.audit_events to authenticated;
grant select, insert on public.import_batches, public.import_rows to authenticated;

-- Save the batch and its rows atomically. SECURITY INVOKER keeps the caller's RLS checks.
create or replace function public.save_import_batch(
  p_company_id uuid,
  p_file_name text,
  p_file_sha256 text,
  p_sheet_name text,
  p_mapping jsonb,
  p_rows jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_batch_id uuid;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 5000 then
    raise exception 'invalid_import_rows' using errcode = '22023';
  end if;

  insert into public.import_batches (
    company_id, source_file_name, source_file_sha256, source_sheet, status, mapping, totals, created_by
  ) values (
    p_company_id, p_file_name, p_file_sha256, p_sheet_name, 'draft', coalesce(p_mapping, '{}'::jsonb),
    jsonb_build_object('rows', jsonb_array_length(p_rows)), (select auth.uid())
  ) returning id into v_batch_id;

  insert into public.import_rows (batch_id, source_row_number, source_values, validation_state, messages)
  select v_batch_id,
    (row_data->>'row_number')::integer,
    row_data->'source_values',
    row_data->>'validation_state',
    coalesce(row_data->'messages', '[]'::jsonb)
  from jsonb_array_elements(p_rows) as parsed_rows(row_data);

  return v_batch_id;
end;
$$;
revoke all on function public.save_import_batch(uuid, text, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.save_import_batch(uuid, text, text, text, jsonb, jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'financial-documents', 'financial-documents', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Document objects are private. Application authorization and object path policies are added
-- with the attachment module before any files are uploaded.
