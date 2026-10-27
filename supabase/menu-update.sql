-- Laurel Aesthetics: NEW MENU (October 2026). Paste all of this into Supabase › SQL Editor › New query, then Run.
-- Safe to run more than once: the menu is only loaded if it isn't there yet.
-- Old treatments are hidden, not deleted, so past bookings keep their treatment names.

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

-- ---------- load the new menu (once) ----------
do $menu$
begin
  if exists (select 1 from public.services where name = 'Regima Initiation Peel' and active) then
    raise notice 'The new menu is already loaded.';
    return;
  end if;
  update public.services set active = false where active;
  update public.providers set role = 'Nail specialist (rents the space)' where external and role = 'Nail technician (rents the space)';
  insert into public.services (name, cat, mins, price, description, addon, sort, provider_id)
  select m.name, m.cat, m.mins, m.price, m.description, m.addon, m.sort,
    (select id from public.providers where external = (m.who = 'symm') order by sort limit 1)
  from (values
    ('Eyebrow / Lip / Nose / Chin / Side Burns','Waxing',15,100,'',false,0,'laurel'),
    ('Full Face (excl. Eyebrows)','Waxing',30,380,'',false,1,'laurel'),
    ('Full Leg (Her)','Waxing',45,350,'',false,2,'laurel'),
    ('Full Leg (Him)','Waxing',60,400,'',false,3,'laurel'),
    ('Full Arm (Her)','Waxing',30,210,'',false,4,'laurel'),
    ('Full Arm (Him)','Waxing',30,300,'',false,5,'laurel'),
    ('Half Arm (Her)','Waxing',20,190,'',false,6,'laurel'),
    ('Half Arm (Him)','Waxing',20,200,'',false,7,'laurel'),
    ('Full Back','Waxing',30,400,'',false,8,'laurel'),
    ('Half Back','Waxing',20,290,'',false,9,'laurel'),
    ('Unibrow','Waxing',10,80,'',false,10,'laurel'),
    ('Fingers / Toes','Waxing',15,100,'',false,11,'laurel'),
    ('Full Face','Sugar Wax',30,380,'',false,12,'laurel'),
    ('Full Bikini (Front & Back)','Sugar Wax',45,400,'',false,13,'laurel'),
    ('Hollywood','Sugar Wax',45,380,'',false,14,'laurel'),
    ('Brazilian','Sugar Wax',40,280,'',false,15,'laurel'),
    ('Basic Bikini','Sugar Wax',30,230,'',false,16,'laurel'),
    ('Underarm','Sugar Wax',15,190,'',false,17,'laurel'),
    ('Upper Lip','Sugar Wax',10,100,'',false,18,'laurel'),
    ('Chin','Sugar Wax',10,100,'',false,19,'laurel'),
    ('Brow Lamination','Brow & Lashes',45,380,'Includes shape & tint',false,20,'laurel'),
    ('Lash Lift','Brow & Lashes',60,550,'Includes tint',false,21,'laurel'),
    ('Lash Tint','Brow & Lashes',20,110,'',false,22,'laurel'),
    ('Brow Tint','Brow & Lashes',15,100,'',false,23,'laurel'),
    ('Brow Shape & Tint','Brow & Lashes',30,210,'',false,24,'laurel'),
    ('Skin Tag Removal (per tag)','Plasma Skin Tag Removal',30,180,'',false,25,'laurel'),
    ('Large Area (per session)','Plasma Skin Tag Removal',60,1200,'',false,26,'laurel'),
    ('Deep Cleanse','Facial Combos',75,950,'Cleanse, exfoliation, extractions, purifying mask, aftercare and protect with Brow Shape & Tint',false,27,'laurel'),
    ('Glow Reset','Facial Combos',75,1250,'Dermaplane with Brow Shape & Tint, Neck & Shoulder Massage & Jelly Mask',false,28,'laurel'),
    ('Collagen Boost','Facial Combos',90,1900,'Dermapen Full Face with Dermaplane, Brow Shape & Tint and Neck & Shoulder Massage',false,29,'laurel'),
    ('Regima Initiation Peel','Facial Peels',45,850,'Brightens, renews and improves texture',false,30,'laurel'),
    ('Regima Rapid Rejuvo','Facial Peels',45,850,'Targets fine lines, sun damage and dull skin',false,31,'laurel'),
    ('Regima Acne Attack','Facial Peels',45,850,'Deep cleanse and controls breakouts',false,32,'laurel'),
    ('Regima Double Whammy','Facial Peels',60,1150,'Powerful combination for stubborn concerns',false,33,'laurel'),
    ('Regima Power Peel 30','Facial Peels',45,850,'Advanced exfoliation and rejuvenation',false,34,'laurel'),
    ('Regima Power Peel 50','Facial Peels',45,850,'Intensive resurfacing for significant results',false,35,'laurel'),
    ('Essel Aesthet Peel','Facial Peels',45,850,'Revitalises, smooths and brightens the skin',false,36,'laurel'),
    ('Essel Retinol Peel','Facial Peels',45,950,'Powerful renewal peel. You will have visible shedding, so please plan around upcoming events.',false,37,'laurel'),
    ('Dr K Cherry Peel','Facial Peels',45,850,'Brightening and antioxidant repair',false,38,'laurel'),
    ('Dr K Pumpkin Peel','Facial Peels',45,850,'Exfoliates, refines and rejuvenates',false,39,'laurel'),
    ('Manicure (Basic)','Hands & Feet',45,280,'',false,40,'laurel'),
    ('Gelish Hands','Hands & Feet',45,350,'',false,41,'laurel'),
    ('Gel Toes (Colour)','Hands & Feet',45,340,'',false,42,'laurel'),
    ('Gel Toes (French)','Hands & Feet',50,360,'',false,43,'laurel'),
    ('Pedi Lux','Hands & Feet',60,420,'Exfoliation, nail care, massage and hydration',false,44,'laurel'),
    ('Medi Heel Pedi','Hands & Feet',75,475,'Includes Mediheel treatment, exfoliation, nail care, massage and hydration',false,45,'laurel'),
    ('Back & Neck Massage','Massage',30,400,'',false,46,'laurel'),
    ('Add on Peel','Add On Menu',20,380,'',true,47,'laurel'),
    ('Add on Dermaplane','Add On Menu',15,220,'',true,48,'laurel'),
    ('Add on Jelly Mask','Add On Menu',15,150,'',true,49,'laurel'),
    ('Add on Neck Massage','Add On Menu',20,380,'',true,50,'laurel'),
    ('Add on Décolleté','Add On Menu',20,380,'',true,51,'laurel'),
    ('Add on Gelish','Add On Menu',30,220,'',true,52,'laurel'),
    ('Gel Polish Hands (Colour)','Gel Polish',45,350,'',false,53,'symm'),
    ('Gel Polish Hands (French)','Gel Polish',50,370,'',false,54,'symm'),
    ('Gel Polish Toes (Colour)','Gel Polish',45,340,'',false,55,'symm'),
    ('Gel Polish Toes (French)','Gel Polish',50,360,'',false,56,'symm'),
    ('Gel Removal Before New Set (Hands)','Gel Polish',15,100,'',true,57,'symm'),
    ('Gel Removal Before New Set (Toes)','Gel Polish',15,60,'',true,58,'symm'),
    ('Product Removal Only','Gel Polish',30,200,'Includes neatening up of nails',false,59,'symm'),
    ('Rubber Base Natural Overlay New Set (Hands)','Rubber Base (Nele & Glam Pro)',60,460,'',false,60,'symm'),
    ('Rubber Base Fill (Natural)','Rubber Base (Nele & Glam Pro)',60,460,'',false,61,'symm'),
    ('Rubber Base Fill (Colour / French / Ombre)','Rubber Base (Nele & Glam Pro)',75,480,'',false,62,'symm'),
    ('Builder Gel Natural Overlay New Set (Hands)','Builder Gel (Nele & LCN)',75,500,'',false,63,'symm'),
    ('Builder Gel Natural Full Set Tips','Builder Gel (Nele & LCN)',90,520,'',false,64,'symm'),
    ('Builder Gel Fill (Natural)','Builder Gel (Nele & LCN)',75,500,'',false,65,'symm'),
    ('Builder Gel Fill (Colour / French / Ombre)','Builder Gel (Nele & LCN)',90,520,'',false,66,'symm'),
    ('Acrylic Natural Overlay','Acrylic',75,450,'',false,67,'symm'),
    ('Acrylic Natural Full Set Tips','Acrylic',90,470,'',false,68,'symm'),
    ('Acrylic Natural Fill','Acrylic',75,450,'',false,69,'symm'),
    ('Acrylic Fill (Colour / French / Ombre)','Acrylic',90,470,'',false,70,'symm'),
    ('Basic Manicure','Hand & Feet Care',45,280,'',false,71,'symm'),
    ('Full Pedicure','Hand & Feet Care',60,420,'Does not include gel',false,72,'symm'),
    ('Add On Colour / French / Ombre','Add Ons',15,120,'For rubber base, builder gel or acrylic',true,73,'symm'),
    ('Add On Gel Polish','Add Ons',30,220,'With a manicure or pedicure',true,74,'symm'),
    ('Nail Art (per nail)','Add Ons',10,5,'R5 to R25 per nail, depending on the design',true,75,'symm'),
    ('Nail Repair (per nail)','Add Ons',10,80,'',true,76,'symm')
  ) as m(name, cat, mins, price, description, addon, sort, who);
  
  update public.studio set settings = settings || '{"policy":"Cancellations or rescheduling require at least 24 hours'' notice. Late cancellations or missed appointments will incur a fee.","menuNote":"Tapputi Perfumes available in studio: a collection of 30 exquisite perfume oils inspired by ancient beauty rituals.","catNotes":{"Gel Polish":"Soaked off before each new application","Rubber Base (Nele & Glam Pro)":"Can be filled and does not need to be removed before each new session","Builder Gel (Nele & LCN)":"Strength like acrylic, flexibility like gel. Ideal for weak and longer nails. Can be filled and does not need to be removed before each new set","Acrylic":"Can be filled. Soak off and new application required when needed"}}'::jsonb where id = 1;
  update public.faq set a = 'Cancellations or rescheduling require at least 24 hours'' notice. Late cancellations or missed appointments will incur a fee.' where q = 'What is your cancellation policy?';
  update public.faq set a = 'Nails are done in the same space by Symm, our resident nail specialist. Tap Symm''s page at the top of the booking page to see her menu and book.' where q = 'Do you do nails?';
  insert into public.faq (q, kw, a, sort)
  select 'Do you sell perfume?','perfume perfumes tapputi oil oils scent fragrance gift','Yes. We stock Tapputi Perfumes, a collection of 30 perfume oils inspired by ancient beauty rituals. Ask us in studio.', coalesce(max(sort),0)+1 from public.faq
  where not exists (select 1 from public.faq where q = 'Do you sell perfume?');
end $menu$;
