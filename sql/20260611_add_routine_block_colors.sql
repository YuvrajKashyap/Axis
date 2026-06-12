begin;

alter table axis.daily_routine_blocks
  add column if not exists color text not null default '#7c3aed';

alter table axis.daily_routine_blocks
  alter column color set default '#7c3aed';

alter table axis.daily_routine_blocks
  drop constraint if exists daily_routine_blocks_color_check;

with ranked_blocks as (
  select
    id,
    row_number() over (
      partition by user_id
      order by sort_order, created_at, id
    ) - 1 as color_index
  from axis.daily_routine_blocks
  where lower(color) = 'violet'
)
update axis.daily_routine_blocks block
set color = (
  array['#7c3aed', '#06b6d4', '#d946ef', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e']
)[(ranked_blocks.color_index % 7) + 1]
from ranked_blocks
where block.id = ranked_blocks.id
  and lower(block.color) = 'violet';

update axis.daily_routine_blocks
set color = case lower(color)
  when 'violet' then '#7c3aed'
  when 'cyan' then '#06b6d4'
  when 'fuchsia' then '#d946ef'
  when 'blue' then '#3b82f6'
  when 'emerald' then '#10b981'
  when 'amber' then '#f59e0b'
  when 'rose' then '#f43f5e'
  else
    case
      when color ~ '^#[0-9A-Fa-f]{6}$' then lower(color)
      else '#7c3aed'
    end
end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'daily_routine_blocks_color_check'
      and conrelid = 'axis.daily_routine_blocks'::regclass
  ) then
    alter table axis.daily_routine_blocks
      add constraint daily_routine_blocks_color_check
      check (color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;

notify pgrst, 'reload schema';

commit;
