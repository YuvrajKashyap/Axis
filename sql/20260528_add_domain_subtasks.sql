begin;

do $$
declare
  enum_schema text;
  enum_name text;
begin
  select udt_schema, udt_name
    into enum_schema, enum_name
  from information_schema.columns
  where table_schema = 'axis'
    and table_name = 'domains'
    and column_name = 'commitment_requirement'
    and data_type = 'USER-DEFINED';

  if enum_schema is not null and enum_name is not null then
    execute format(
      'alter type %I.%I add value if not exists %L',
      enum_schema,
      enum_name,
      'SUBTASKS'
    );
  end if;
end
$$;

alter table axis.domains
  add column if not exists subtask_reset_mode text not null default 'DAILY',
  add column if not exists subtask_time_zone text not null default 'UTC';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'domains_subtask_reset_mode_check'
  ) then
    alter table axis.domains
      add constraint domains_subtask_reset_mode_check
      check (subtask_reset_mode in ('DAILY', 'DRIFT_CYCLE'));
  end if;
end
$$;

create table if not exists axis.domain_subtasks (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  domain_id text not null references axis.domains(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists domain_subtasks_user_domain_sort_idx
  on axis.domain_subtasks(user_id, domain_id, sort_order);

create table if not exists axis.domain_subtask_completions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  domain_id text not null references axis.domains(id) on delete cascade,
  subtask_id text not null references axis.domain_subtasks(id) on delete cascade,
  period_key text not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (subtask_id, period_key)
);

create index if not exists domain_subtask_completions_user_domain_period_idx
  on axis.domain_subtask_completions(user_id, domain_id, period_key);

grant usage on schema axis to authenticated;
grant select, insert, update, delete on axis.domain_subtasks to authenticated;
grant select, insert, update, delete on axis.domain_subtask_completions to authenticated;

alter table axis.domain_subtasks enable row level security;
alter table axis.domain_subtask_completions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'domain_subtasks'
      and policyname = 'domain_subtasks_select_own'
  ) then
    create policy domain_subtasks_select_own
      on axis.domain_subtasks
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'domain_subtasks'
      and policyname = 'domain_subtasks_insert_own'
  ) then
    create policy domain_subtasks_insert_own
      on axis.domain_subtasks
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'domain_subtasks'
      and policyname = 'domain_subtasks_update_own'
  ) then
    create policy domain_subtasks_update_own
      on axis.domain_subtasks
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'domain_subtasks'
      and policyname = 'domain_subtasks_delete_own'
  ) then
    create policy domain_subtasks_delete_own
      on axis.domain_subtasks
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'domain_subtask_completions'
      and policyname = 'domain_subtask_completions_select_own'
  ) then
    create policy domain_subtask_completions_select_own
      on axis.domain_subtask_completions
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'domain_subtask_completions'
      and policyname = 'domain_subtask_completions_insert_own'
  ) then
    create policy domain_subtask_completions_insert_own
      on axis.domain_subtask_completions
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'domain_subtask_completions'
      and policyname = 'domain_subtask_completions_update_own'
  ) then
    create policy domain_subtask_completions_update_own
      on axis.domain_subtask_completions
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'domain_subtask_completions'
      and policyname = 'domain_subtask_completions_delete_own'
  ) then
    create policy domain_subtask_completions_delete_own
      on axis.domain_subtask_completions
      for delete
      using (auth.uid() = user_id);
  end if;
end
$$;

commit;
