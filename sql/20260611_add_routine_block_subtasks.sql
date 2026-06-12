begin;

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

grant select, insert, update, delete on axis.daily_routine_block_subtasks to authenticated;
grant select, insert, delete on axis.daily_routine_block_subtask_completions to authenticated;

alter table axis.daily_routine_block_subtasks enable row level security;
alter table axis.daily_routine_block_subtask_completions enable row level security;

do $$
begin
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
end $$;

notify pgrst, 'reload schema';

commit;
