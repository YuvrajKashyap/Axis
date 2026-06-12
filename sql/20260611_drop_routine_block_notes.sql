begin;

alter table axis.daily_routine_blocks
  drop column if exists note;

notify pgrst, 'reload schema';

commit;
