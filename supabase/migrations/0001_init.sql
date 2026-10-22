-- Laurel Aesthetics: tables, security rules and public booking functions.
-- Studio staff (your sister) see and change everything once signed in.
-- Anyone else can only read the public menu and request a booking.

create extension if not exists pgcrypto;

-- ---------- staff ----------
create table public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

-- ---------- studio data ----------
create table public.studio (
  id int primary key default 1 check (id = 1),
  settings jsonb not null,
  budget jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default '',
  external boolean not null default false,
  sort int not null default 0
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cat text not null,
  mins int not null check (mins > 0),
  price numeric(10,2) not null check (price >= 0),
  provider_id uuid not null references public.providers(id) on delete restrict,
  active boolean not null default true
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  email text not null default '',
  notes text not null default '',
  created date not null default current_date
);
create index clients_phone_idx on public.clients (regexp_replace(phone, '\D', '', 'g'));

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  provider_id uuid not null references public.providers(id) on delete restrict,
  date date not null,
  time text not null check (time ~ '^\d\d:\d\d$'),
  mins int not null default 60,
  status text not null default 'requested'
    check (status in ('requested','confirmed','done','noshow','cancelled','declined')),
  paid boolean not null default false,
  method text not null default '',
  amount numeric(10,2),
  notes text not null default '',
  source text not null default 'studio',
  created_at timestamptz not null default now()
);
create index bookings_date_idx on public.bookings (date);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  amount numeric(10,2) not null,
  cat text not null,
  supplier text not null default '',
  note text not null default '',
  receipt_path text,
  receipt_name text not null default ''
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  amount numeric(10,2) not null,
  "desc" text not null default '',
  method text not null default ''
);

create table public.stock (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  qty int not null default 0,
  min int not null default 0
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  due date,
  done boolean not null default false
);

create table public.faq (
  id uuid primary key default gen_random_uuid(),
  q text not null,
  kw text not null default '',
  a text not null,
  sort int not null default 0
);

-- ---------- security ----------
do $$
declare t text;
begin
  foreach t in array array['studio','providers','services','clients','bookings','expenses','sales','stock','tasks','faq'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy staff_all on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;
alter table public.staff enable row level security;
create policy staff_self on public.staff for select to authenticated using (user_id = auth.uid());

-- ---------- public functions (used by the client booking page) ----------

-- The public menu: business details, people, active services and FAQ answers.
create or replace function public.public_studio() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'settings', (select settings - 'vatThreshold' from studio where id = 1),
    'providers', coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'role',role,'external',external) order by sort) from providers), '[]'),
    'services', coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'cat',cat,'mins',mins,'price',price,'providerId',provider_id) order by cat, price) from services where active), '[]'),
    'faq', coalesce((select jsonb_agg(jsonb_build_object('id',id,'q',q,'kw',kw,'a',a) order by sort) from faq), '[]')
  );
$$;

-- Taken times only: no names, no treatments.
create or replace function public.busy_times(from_date date, to_date date)
returns table (provider_id uuid, date date, "time" text, mins int)
language sql stable security definer set search_path = public as $$
  select b.provider_id, b.date, b.time, b.mins
  from bookings b
  where b.date between from_date and least(to_date, from_date + 62)
    and b.status not in ('cancelled','declined','noshow');
$$;

-- A client asks for a time. It becomes a 'requested' booking the studio confirms.
create or replace function public.request_booking(
  p_service uuid, p_date date, p_time text,
  p_name text, p_phone text, p_email text default '', p_notes text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s services; c_id uuid; b_id uuid; hrs jsonb; st int; dow int;
  norm text := regexp_replace(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), '^27', '0');
begin
  if length(trim(coalesce(p_name,''))) < 2 or length(norm) < 9 then
    raise exception 'Please give your name and a valid cell number.';
  end if;
  if length(p_notes) > 1000 or length(p_name) > 120 or length(p_email) > 200 then
    raise exception 'That message is too long.';
  end if;
  select * into s from services where id = p_service and active;
  if not found then raise exception 'That treatment is not available.'; end if;
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
  values (c_id, s.id, s.provider_id, p_date, p_time, s.mins, 'requested', s.price, coalesce(p_notes,''), 'online')
  returning id into b_id;
  return b_id;
end $$;

revoke all on function public.request_booking from public;
grant execute on function public.public_studio() to anon, authenticated;
grant execute on function public.busy_times(date, date) to anon, authenticated;
grant execute on function public.request_booking(uuid, date, text, text, text, text, text) to anon, authenticated;
grant execute on function public.is_staff() to authenticated;

-- ---------- receipts storage (private) ----------
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false)
on conflict (id) do nothing;
create policy receipts_staff on storage.objects for all to authenticated
  using (bucket_id = 'receipts' and public.is_staff())
  with check (bucket_id = 'receipts' and public.is_staff());

-- ---------- live updates for new booking requests ----------
alter publication supabase_realtime add table public.bookings;
