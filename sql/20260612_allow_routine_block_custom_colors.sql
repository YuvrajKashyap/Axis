begin;

alter table axis.daily_routine_blocks
  add column if not exists color text not null default '#7c3aed';

alter table axis.daily_routine_blocks
  alter column color set default '#7c3aed';

alter table axis.daily_routine_blocks
  drop constraint if exists daily_routine_blocks_color_check;

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

alter table axis.daily_routine_blocks
  add constraint daily_routine_blocks_color_check
  check (color ~ '^#[0-9A-Fa-f]{6}$');

notify pgrst, 'reload schema';

commit;
