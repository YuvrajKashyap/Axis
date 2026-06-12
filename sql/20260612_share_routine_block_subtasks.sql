begin;

alter table axis.daily_routine_block_subtasks
  add column if not exists block_key text;

update axis.daily_routine_block_subtasks subtask
set block_key = lower(regexp_replace(trim(block.title), '\s+', ' ', 'g'))
from axis.daily_routine_blocks block
where subtask.block_id = block.id
  and (subtask.block_key is null or trim(subtask.block_key) = '');

update axis.daily_routine_block_subtasks
set block_key = lower(regexp_replace(trim(title), '\s+', ' ', 'g'))
where block_key is null or trim(block_key) = '';

alter table axis.daily_routine_block_subtasks
  alter column block_key set not null;

alter table axis.daily_routine_block_subtasks
  alter column block_id drop not null;

alter table axis.daily_routine_block_subtasks
  drop constraint if exists daily_routine_block_subtasks_block_id_fkey;

create index if not exists daily_routine_block_subtasks_user_key_idx
  on axis.daily_routine_block_subtasks(user_id, block_key, sort_order);

drop policy if exists daily_routine_block_subtasks_insert_own
  on axis.daily_routine_block_subtasks;

create policy daily_routine_block_subtasks_insert_own
  on axis.daily_routine_block_subtasks
  for insert
  with check (
    auth.uid() = user_id
    and length(trim(block_key)) between 1 and 120
  );

drop policy if exists daily_routine_block_subtasks_update_own
  on axis.daily_routine_block_subtasks;

create policy daily_routine_block_subtasks_update_own
  on axis.daily_routine_block_subtasks
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and length(trim(block_key)) between 1 and 120
  );

notify pgrst, 'reload schema';

commit;
