begin;

create temp table daily_focus_item_map on commit drop as
with normalized_items as (
  select
    id,
    user_id,
    label,
    weekday,
    sort_order,
    created_at,
    lower(regexp_replace(trim(label), '\s+', ' ', 'g')) as normalized_label
  from axis.daily_checklist_items
),
ranked_items as (
  select
    *,
    row_number() over (
      partition by user_id, normalized_label
      order by
        case when weekday = 1 then 0 else 1 end,
        sort_order,
        created_at,
        id
    ) as label_rank
  from normalized_items
)
select
  duplicate.id as old_item_id,
  canonical.id as new_item_id
from ranked_items duplicate
join ranked_items canonical
  on canonical.user_id = duplicate.user_id
  and canonical.normalized_label = duplicate.normalized_label
  and canonical.label_rank = 1
where duplicate.label_rank > 1;

delete from axis.daily_checklist_completions completion
using daily_focus_item_map item_map
where completion.item_id = item_map.old_item_id
  and exists (
    select 1
    from axis.daily_checklist_completions existing_completion
    where existing_completion.user_id = completion.user_id
      and existing_completion.date_key = completion.date_key
      and existing_completion.item_id = item_map.new_item_id
  );

update axis.daily_checklist_completions completion
set item_id = item_map.new_item_id
from daily_focus_item_map item_map
where completion.item_id = item_map.old_item_id;

delete from axis.daily_routine_block_items block_item
using daily_focus_item_map item_map
where block_item.item_id = item_map.old_item_id
  and exists (
    select 1
    from axis.daily_routine_block_items existing_block_item
    where existing_block_item.block_id = block_item.block_id
      and existing_block_item.item_id = item_map.new_item_id
  );

update axis.daily_routine_block_items block_item
set item_id = item_map.new_item_id
from daily_focus_item_map item_map
where block_item.item_id = item_map.old_item_id;

delete from axis.daily_checklist_items item
using daily_focus_item_map item_map
where item.id = item_map.old_item_id;

create temp table daily_focus_item_order on commit drop as
select
  id,
  row_number() over (
    partition by user_id
    order by sort_order, created_at, id
  ) - 1 as next_sort_order
from axis.daily_checklist_items;

update axis.daily_checklist_items item
set
  weekday = 1,
  sort_order = item_order.next_sort_order,
  updated_at = now()
from daily_focus_item_order item_order
where item.id = item_order.id;

commit;
