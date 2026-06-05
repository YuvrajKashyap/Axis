begin;

create table if not exists axis.daily_checklist_items (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday integer not null check (weekday between 1 and 7),
  label text not null check (length(trim(label)) between 1 and 140),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_checklist_items_user_weekday_sort_idx
  on axis.daily_checklist_items(user_id, weekday, sort_order);

create table if not exists axis.daily_checklist_completions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references axis.daily_checklist_items(id) on delete cascade,
  date_key text not null check (date_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, item_id, date_key)
);

create index if not exists daily_checklist_completions_user_date_idx
  on axis.daily_checklist_completions(user_id, date_key);

create table if not exists axis.daily_checklist_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  move_checked_to_bottom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant usage on schema axis to authenticated;
grant select, insert, update, delete on axis.daily_checklist_items to authenticated;
grant select, insert, update, delete on axis.daily_checklist_completions to authenticated;
grant select, insert, update, delete on axis.daily_checklist_settings to authenticated;

alter table axis.daily_checklist_items enable row level security;
alter table axis.daily_checklist_completions enable row level security;
alter table axis.daily_checklist_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_checklist_items'
      and policyname = 'daily_checklist_items_select_own'
  ) then
    create policy daily_checklist_items_select_own
      on axis.daily_checklist_items
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_checklist_items'
      and policyname = 'daily_checklist_items_insert_own'
  ) then
    create policy daily_checklist_items_insert_own
      on axis.daily_checklist_items
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_checklist_items'
      and policyname = 'daily_checklist_items_update_own'
  ) then
    create policy daily_checklist_items_update_own
      on axis.daily_checklist_items
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_checklist_items'
      and policyname = 'daily_checklist_items_delete_own'
  ) then
    create policy daily_checklist_items_delete_own
      on axis.daily_checklist_items
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_checklist_completions'
      and policyname = 'daily_checklist_completions_select_own'
  ) then
    create policy daily_checklist_completions_select_own
      on axis.daily_checklist_completions
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_checklist_completions'
      and policyname = 'daily_checklist_completions_insert_own'
  ) then
    create policy daily_checklist_completions_insert_own
      on axis.daily_checklist_completions
      for insert
      with check (
        auth.uid() = user_id
        and exists (
          select 1
          from axis.daily_checklist_items item
          where item.id = item_id
            and item.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_checklist_completions'
      and policyname = 'daily_checklist_completions_update_own'
  ) then
    create policy daily_checklist_completions_update_own
      on axis.daily_checklist_completions
      for update
      using (auth.uid() = user_id)
      with check (
        auth.uid() = user_id
        and exists (
          select 1
          from axis.daily_checklist_items item
          where item.id = item_id
            and item.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_checklist_completions'
      and policyname = 'daily_checklist_completions_delete_own'
  ) then
    create policy daily_checklist_completions_delete_own
      on axis.daily_checklist_completions
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_checklist_settings'
      and policyname = 'daily_checklist_settings_select_own'
  ) then
    create policy daily_checklist_settings_select_own
      on axis.daily_checklist_settings
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_checklist_settings'
      and policyname = 'daily_checklist_settings_insert_own'
  ) then
    create policy daily_checklist_settings_insert_own
      on axis.daily_checklist_settings
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_checklist_settings'
      and policyname = 'daily_checklist_settings_update_own'
  ) then
    create policy daily_checklist_settings_update_own
      on axis.daily_checklist_settings
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_checklist_settings'
      and policyname = 'daily_checklist_settings_delete_own'
  ) then
    create policy daily_checklist_settings_delete_own
      on axis.daily_checklist_settings
      for delete
      using (auth.uid() = user_id);
  end if;
end
$$;

notify pgrst, 'reload schema';

commit;
