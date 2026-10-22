-- Starting data: settings, the two people in the space, a sample price list and draft FAQ answers.
-- Prices and hours are placeholders: change them in the app under Studio.

insert into public.studio (id, settings, budget) values (1,
  '{"business":"Laurel Aesthetics","tagline":"It''s all about you","address":"Silver Lakes Golf Estate, Pretoria East",
    "whatsapp":"","email":"","vatThreshold":1000000,"slotStep":30,
    "hours":[null,["08:00","17:00"],["08:00","17:00"],["08:00","17:00"],["08:00","17:00"],["08:00","17:00"],["08:00","13:00"]]}',
  '{"Rent":6500,"Stock & products":4000,"Consumables":1200,"Equipment":500,"Marketing":800,"Utilities & Wi-Fi":700,"Insurance":400,"Training":1000,"Bank fees":150,"Other":300}')
on conflict (id) do nothing;

with p as (
  insert into public.providers (name, role, external, sort) values
    ('Laurel Aesthetics', 'Skin & beauty treatments', false, 0),
    ('Symm', 'Nail technician (rents the space)', true, 1)
  returning id, name
)
insert into public.services (name, cat, mins, price, provider_id)
select s.name, s.cat, s.mins, s.price, p.id
from (values
  ('Signature facial','Facials',60,650,'Laurel Aesthetics'),
  ('Express hydrating facial','Facials',30,380,'Laurel Aesthetics'),
  ('Dermaplaning','Skin treatments',45,550,'Laurel Aesthetics'),
  ('Chemical peel','Skin treatments',45,750,'Laurel Aesthetics'),
  ('Microneedling','Skin treatments',75,1200,'Laurel Aesthetics'),
  ('Lash lift & tint','Lashes & brows',60,480,'Laurel Aesthetics'),
  ('Brow lamination & tint','Lashes & brows',45,420,'Laurel Aesthetics'),
  ('Full leg wax','Waxing',45,380,'Laurel Aesthetics'),
  ('Underarm wax','Waxing',15,120,'Laurel Aesthetics'),
  ('Rubber base overlay','Nails with Symm',60,320,'Symm'),
  ('Gel polish (hands)','Nails with Symm',45,250,'Symm'),
  ('Builder gel (BIAB)','Nails with Symm',75,380,'Symm'),
  ('Classic French add-on','Nails with Symm',15,60,'Symm')
) as s(name, cat, mins, price, who)
join p on p.name = s.who;

insert into public.faq (q, kw, a, sort) values
 ('What are your opening hours?','hours open close closing time saturday sunday weekend when oop ure','{{hours}}',0),
 ('Where are you?','where location address find directions silver lakes estate gate access parking','We''re inside Silver Lakes Golf Estate, Pretoria East. It''s a secure estate, so please bring your ID and give your name at the gate. We''ll register you as a visitor once your booking is confirmed.',1),
 ('How much does it cost?','price prices cost costs much menu rate rates hoeveel prys','{{prices}}',2),
 ('How can I pay?','pay payment card cash eft snapscan','We accept card, cash, EFT and SnapScan. Payment is due after your treatment.',3),
 ('What is your cancellation policy?','cancel cancellation reschedule late move change postpone','Please give us at least 24 hours'' notice to cancel or move your appointment. Late cancellations and no-shows may be charged 50% of the treatment price.',4),
 ('How do I prepare for a facial or peel?','prepare preparation before facial peel retinol makeup','Come with a clean face if you can. For a peel, dermaplaning or microneedling, stop retinol and exfoliating acids 3 to 5 days before, and avoid waxing the area.',5),
 ('Can I have treatments while pregnant?','pregnant pregnancy breastfeeding','Gentle facials are usually fine, but most peels and microneedling aren''t recommended while pregnant or breastfeeding. Please mention it when you book so we can suggest the right treatment.',6),
 ('Do you sell gift vouchers?','voucher vouchers gift present birthday','Yes. Gift vouchers are available for any treatment or amount. Ask us and we''ll set one up for you.',7),
 ('Can men book treatments?','men man male guys husband boyfriend','Yes, everyone is welcome. Facials, skin treatments, brows and waxing are all available to men.',8),
 ('Do you do nails?','nails nail gel rubber builder biab french manicure symm','Nails are done in the same space by Symm, our resident nail technician. You can book her treatments here too.',9);
