begin;

alter table axis.domains
  add column if not exists warning_lead_hours integer;

update axis.domains
set warning_lead_hours = case
  when drift_mode = 'NEVER' then null
  else 12
end
where warning_lead_hours is null;

alter table axis.domains
  alter column warning_lead_hours set default 12;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'domains_warning_lead_hours_check'
  ) then
    alter table axis.domains
      add constraint domains_warning_lead_hours_check
      check (
        warning_lead_hours is null
        or (warning_lead_hours >= 1 and warning_lead_hours <= 168)
      );
  end if;
end
$$;

create or replace function axis.get_public_demo_orrery()
returns table (
  id text,
  name text,
  slug text,
  status text,
  identity text,
  next_move text,
  primary_reason text,
  position_x double precision,
  color text,
  drift_mode text,
  drift_threshold_hours integer,
  warning_lead_hours integer,
  commitment_requirement text,
  orbit_speed text,
  visual_intensity text,
  planet_size_scale double precision,
  orbit_eccentricity text,
  last_passive_alignment_at timestamptz,
  last_commitment_at timestamptz,
  last_commitment_text text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    d.id::text,
    d.name,
    d.slug,
    d.status::text,
    d.identity,
    d.next_move,
    d.primary_reason,
    d.position_x,
    d.color,
    d.drift_mode::text,
    d.drift_threshold_hours,
    d.warning_lead_hours,
    d.commitment_requirement::text,
    d.orbit_speed::text,
    d.visual_intensity::text,
    d.planet_size_scale::double precision,
    d.orbit_eccentricity::text,
    d.last_passive_alignment_at,
    lc.created_at as last_commitment_at,
    lc.text as last_commitment_text
  from axis.domains d
  left join lateral (
    select c.created_at, c.text
    from axis.commitments c
    where c.domain_id = d.id
    order by c.created_at desc, c.id desc
    limit 1
  ) lc on true
  where d.user_id = '5c07f54a-91dd-44e3-b222-4bdb0dc0e8d7'::uuid
  order by d.created_at asc, d.id asc;
$$;

revoke all on function axis.get_public_demo_orrery() from public;
grant execute on function axis.get_public_demo_orrery() to anon, authenticated;

commit;
