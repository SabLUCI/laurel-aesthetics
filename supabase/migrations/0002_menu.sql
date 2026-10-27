-- Menu update (October 2026): descriptions, extras (add-ons) and menu order for services,
-- and booking requests that can include extras.

alter table public.services
  add column if not exists description text not null default '',
  add column if not exists addon boolean not null default false,
  add column if not exists sort int not null default 0;

create or replace function public.public_studio() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'settings', (select settings - 'vatThreshold' from studio where id = 1),
    'providers', coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'role',role,'external',external) order by sort) from providers), '[]'),
    'services', coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'cat',cat,'mins',mins,'price',price,'providerId',provider_id,
        'description',description,'addon',addon,'sort',sort) order by sort, cat, price) from services where active), '[]'),
    'faq', coalesce((select jsonb_agg(jsonb_build_object('id',id,'q',q,'kw',kw,'a',a) order by sort) from faq), '[]')
  );
$$;

drop function if exists public.request_booking(uuid, date, text, text, text, text, text);
create or replace function public.request_booking(
  p_service uuid, p_date date, p_time text,
  p_name text, p_phone text, p_email text default '', p_notes text default '',
  p_addons uuid[] default '{}'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s services; c_id uuid; b_id uuid; hrs jsonb; st int; dow int;
  x_mins int := 0; x_price numeric := 0; x_names text := ''; x_count int := 0;
  norm text := regexp_replace(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), '^27', '0');
begin
  if length(trim(coalesce(p_name,''))) < 2 or length(norm) < 9 then
    raise exception 'Please give your name and a valid cell number.';
  end if;
  if length(p_notes) > 1000 or length(p_name) > 120 or length(p_email) > 200 then
    raise exception 'That message is too long.';
  end if;
  select * into s from services where id = p_service and active;
  if not found or s.addon then raise exception 'That treatment is not available.'; end if;
  -- extras: active add-ons from the same person
  select coalesce(sum(mins),0), coalesce(sum(price),0), coalesce(string_agg(name, ', ' order by sort),''), count(*)
    into x_mins, x_price, x_names, x_count
    from services where id = any(coalesce(p_addons,'{}')) and active and addon and provider_id = s.provider_id;
  if x_count <> coalesce(cardinality(array(select distinct unnest(p_addons))),0) then
    raise exception 'One of those extras is not available.';
  end if;
  s.mins := s.mins + x_mins;
  if p_date < (now() at time zone 'Africa/Johannesburg')::date or p_date > (now() at time zone 'Africa/Johannesburg')::date + 62 then
    raise exception 'Please choose a date in the next two months.';
  end if;
  if p_time !~ '^\d\d:\d\d$' then raise exception 'Invalid time.'; end if;
  st := split_part(p_time, ':', 1)::int * 60 + split_part(p_time, ':', 2)::int;
  dow := extract(dow from p_date)::int;
  select settings->'hours'->dow into hrs from studio where id = 1;
  if hrs is null or jsonb_typeof(hrs) <> 'array'
     or st < split_part(hrs->>0, ':', 1)::int * 60 + split_part(hrs->>0, ':', 2)::int
     or st + s.mins > split_part(hrs->>1, ':', 1)::int * 60 + split_part(hrs->>1, ':', 2)::int then
    raise exception 'We are closed at that time.';
  end if;
  -- one request at a time per slot
  perform pg_advisory_xact_lock(hashtext(s.provider_id::text || p_date::text));
  if exists (
    select 1 from bookings b
    where b.provider_id = s.provider_id and b.date = p_date
      and b.status not in ('cancelled','declined','noshow')
      and st < split_part(b.time, ':', 1)::int * 60 + split_part(b.time, ':', 2)::int + b.mins
      and split_part(b.time, ':', 1)::int * 60 + split_part(b.time, ':', 2)::int < st + s.mins
  ) then
    raise exception 'That time was just taken. Please pick another.';
  end if;
  select id into c_id from clients
   where regexp_replace(regexp_replace(phone, '\D', '', 'g'), '^27', '0') = norm limit 1;
  if c_id is null then
    insert into clients (name, phone, email) values (trim(p_name), p_phone, coalesce(p_email,'')) returning id into c_id;
  end if;
  insert into bookings (client_id, service_id, provider_id, date, time, mins, status, amount, notes, source)
  values (c_id, s.id, s.provider_id, p_date, p_time, s.mins, 'requested', s.price + x_price,
          trim(both e'\n' from case when x_count > 0 then 'Extras: ' || x_names else '' end || e'\n' || coalesce(p_notes,'')), 'online')
  returning id into b_id;
  return b_id;
end $$;

revoke all on function public.request_booking from public;
grant execute on function public.request_booking(uuid, date, text, text, text, text, text, uuid[]) to anon, authenticated;
