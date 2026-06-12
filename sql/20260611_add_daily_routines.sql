begin;

create table if not exists axis.daily_routines (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_routines_user_sort_idx
  on axis.daily_routines(user_id, sort_order);

create table if not exists axis.daily_routine_blocks (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id text not null references axis.daily_routines(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 120),
  color text not null default '#7c3aed'
    check (color ~ '^#[0-9A-Fa-f]{6}$'),
  start_minute integer not null check (start_minute between 0 and 1439),
  end_minute integer not null check (end_minute between 1 and 1440),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_minute > start_minute)
);

create index if not exists daily_routine_blocks_routine_sort_idx
  on axis.daily_routine_blocks(user_id, routine_id, sort_order);

create table if not exists axis.daily_routine_block_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  block_id text not null references axis.daily_routine_blocks(id) on delete cascade,
  item_id text not null references axis.daily_checklist_items(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (block_id, item_id)
);

create index if not exists daily_routine_block_items_user_block_idx
  on axis.daily_routine_block_items(user_id, block_id, sort_order);

create table if not exists axis.daily_routine_block_subtasks (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  block_id text not null references axis.daily_routine_blocks(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 140),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_routine_block_subtasks_user_block_idx
  on axis.daily_routine_block_subtasks(user_id, block_id, sort_order);

create table if not exists axis.daily_routine_block_subtask_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  subtask_id text not null references axis.daily_routine_block_subtasks(id) on delete cascade,
  date_key text not null check (date_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  created_at timestamptz not null default now(),
  primary key (subtask_id, date_key)
);

create index if not exists daily_routine_block_subtask_completions_user_date_idx
  on axis.daily_routine_block_subtask_completions(user_id, date_key);

create table if not exists axis.daily_routine_day_selections (
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key text not null check (date_key ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  routine_id text references axis.daily_routines(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date_key)
);

grant usage on schema axis to authenticated;
grant select, insert, update, delete on axis.daily_routines to authenticated;
grant select, insert, update, delete on axis.daily_routine_blocks to authenticated;
grant select, insert, update, delete on axis.daily_routine_block_items to authenticated;
grant select, insert, update, delete on axis.daily_routine_block_subtasks to authenticated;
grant select, insert, delete on axis.daily_routine_block_subtask_completions to authenticated;
grant select, insert, update, delete on axis.daily_routine_day_selections to authenticated;

alter table axis.daily_routines enable row level security;
alter table axis.daily_routine_blocks enable row level security;
alter table axis.daily_routine_block_items enable row level security;
alter table axis.daily_routine_block_subtasks enable row level security;
alter table axis.daily_routine_block_subtask_completions enable row level security;
alter table axis.daily_routine_day_selections enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routines'
      and policyname = 'daily_routines_select_own'
  ) then
    create policy daily_routines_select_own
      on axis.daily_routines
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routines'
      and policyname = 'daily_routines_insert_own'
  ) then
    create policy daily_routines_insert_own
      on axis.daily_routines
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routines'
      and policyname = 'daily_routines_update_own'
  ) then
    create policy daily_routines_update_own
      on axis.daily_routines
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routines'
      and policyname = 'daily_routines_delete_own'
  ) then
    create policy daily_routines_delete_own
      on axis.daily_routines
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routine_blocks'
      and policyname = 'daily_routine_blocks_select_own'
  ) then
    create policy daily_routine_blocks_select_own
      on axis.daily_routine_blocks
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routine_blocks'
      and policyname = 'daily_routine_blocks_insert_own'
  ) then
    create policy daily_routine_blocks_insert_own
      on axis.daily_routine_blocks
      for insert
      with check (
        auth.uid() = user_id
        and exists (
          select 1
          from axis.daily_routines routine
          where routine.id = routine_id
            and routine.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routine_blocks'
      and policyname = 'daily_routine_blocks_update_own'
  ) then
    create policy daily_routine_blocks_update_own
      on axis.daily_routine_blocks
      for update
      using (auth.uid() = user_id)
      with check (
        auth.uid() = user_id
        and exists (
          select 1
          from axis.daily_routines routine
          where routine.id = routine_id
            and routine.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routine_blocks'
      and policyname = 'daily_routine_blocks_delete_own'
  ) then
    create policy daily_routine_blocks_delete_own
      on axis.daily_routine_blocks
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routine_block_items'
      and policyname = 'daily_routine_block_items_select_own'
  ) then
    create policy daily_routine_block_items_select_own
      on axis.daily_routine_block_items
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routine_block_items'
      and policyname = 'daily_routine_block_items_insert_own'
  ) then
    create policy daily_routine_block_items_insert_own
      on axis.daily_routine_block_items
      for insert
      with check (
        auth.uid() = user_id
        and exists (
          select 1
          from axis.daily_routine_blocks block
          where block.id = block_id
            and block.user_id = auth.uid()
        )
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
      and tablename = 'daily_routine_block_items'
      and policyname = 'daily_routine_block_items_update_own'
  ) then
    create policy daily_routine_block_items_update_own
      on axis.daily_routine_block_items
      for update
      using (auth.uid() = user_id)
      with check (
        auth.uid() = user_id
        and exists (
          select 1
          from axis.daily_routine_blocks block
          where block.id = block_id
            and block.user_id = auth.uid()
        )
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
      and tablename = 'daily_routine_block_items'
      and policyname = 'daily_routine_block_items_delete_own'
  ) then
    create policy daily_routine_block_items_delete_own
      on axis.daily_routine_block_items
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routine_block_subtasks'
      and policyname = 'daily_routine_block_subtasks_select_own'
  ) then
    create policy daily_routine_block_subtasks_select_own
      on axis.daily_routine_block_subtasks
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routine_block_subtasks'
      and policyname = 'daily_routine_block_subtasks_insert_own'
  ) then
    create policy daily_routine_block_subtasks_insert_own
      on axis.daily_routine_block_subtasks
      for insert
      with check (
        auth.uid() = user_id
        and exists (
          select 1
          from axis.daily_routine_blocks block
          where block.id = block_id
            and block.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routine_block_subtasks'
      and policyname = 'daily_routine_block_subtasks_update_own'
  ) then
    create policy daily_routine_block_subtasks_update_own
      on axis.daily_routine_block_subtasks
      for update
      using (auth.uid() = user_id)
      with check (
        auth.uid() = user_id
        and exists (
          select 1
          from axis.daily_routine_blocks block
          where block.id = block_id
            and block.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routine_block_subtasks'
      and policyname = 'daily_routine_block_subtasks_delete_own'
  ) then
    create policy daily_routine_block_subtasks_delete_own
      on axis.daily_routine_block_subtasks
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routine_block_subtask_completions'
      and policyname = 'daily_routine_block_subtask_completions_select_own'
  ) then
    create policy daily_routine_block_subtask_completions_select_own
      on axis.daily_routine_block_subtask_completions
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routine_block_subtask_completions'
      and policyname = 'daily_routine_block_subtask_completions_insert_own'
  ) then
    create policy daily_routine_block_subtask_completions_insert_own
      on axis.daily_routine_block_subtask_completions
      for insert
      with check (
        auth.uid() = user_id
        and exists (
          select 1
          from axis.daily_routine_block_subtasks subtask
          where subtask.id = subtask_id
            and subtask.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routine_block_subtask_completions'
      and policyname = 'daily_routine_block_subtask_completions_delete_own'
  ) then
    create policy daily_routine_block_subtask_completions_delete_own
      on axis.daily_routine_block_subtask_completions
      for delete
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routine_day_selections'
      and policyname = 'daily_routine_day_selections_select_own'
  ) then
    create policy daily_routine_day_selections_select_own
      on axis.daily_routine_day_selections
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routine_day_selections'
      and policyname = 'daily_routine_day_selections_insert_own'
  ) then
    create policy daily_routine_day_selections_insert_own
      on axis.daily_routine_day_selections
      for insert
      with check (
        auth.uid() = user_id
        and (
          routine_id is null
          or exists (
            select 1
            from axis.daily_routines routine
            where routine.id = routine_id
              and routine.user_id = auth.uid()
          )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routine_day_selections'
      and policyname = 'daily_routine_day_selections_update_own'
  ) then
    create policy daily_routine_day_selections_update_own
      on axis.daily_routine_day_selections
      for update
      using (auth.uid() = user_id)
      with check (
        auth.uid() = user_id
        and (
          routine_id is null
          or exists (
            select 1
            from axis.daily_routines routine
            where routine.id = routine_id
              and routine.user_id = auth.uid()
          )
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'axis'
      and tablename = 'daily_routine_day_selections'
      and policyname = 'daily_routine_day_selections_delete_own'
  ) then
    create policy daily_routine_day_selections_delete_own
      on axis.daily_routine_day_selections
      for delete
      using (auth.uid() = user_id);
  end if;
end
$$;

notify pgrst, 'reload schema';

commit;
