// The printed menus (Laurel and Symm, October 2026). Used for the demo data and to generate supabase/menu.sql.
// Minutes are estimates: change them in the app under Studio › Services & prices.
// Item: [name, minutes, price, description, addon]. An add-on is offered as an extra on another treatment.
export const POLICY = "Cancellations or rescheduling require at least 24 hours' notice. Late cancellations or missed appointments will incur a fee.";
export const MENU_NOTE = 'Tapputi Perfumes available in studio: a collection of 30 exquisite perfume oils inspired by ancient beauty rituals.';
const A = true;

export const MENU = [
  { who: 'laurel', cat: 'Waxing', items: [
    ['Eyebrow / Lip / Nose / Chin / Side Burns', 15, 100],
    ['Full Face (excl. Eyebrows)', 30, 380],
    ['Full Leg (Her)', 45, 350], ['Full Leg (Him)', 60, 400],
    ['Full Arm (Her)', 30, 210], ['Full Arm (Him)', 30, 300],
    ['Half Arm (Her)', 20, 190], ['Half Arm (Him)', 20, 200],
    ['Full Back', 30, 400], ['Half Back', 20, 290],
    ['Unibrow', 10, 80], ['Fingers / Toes', 15, 100]] },
  { who: 'laurel', cat: 'Sugar Wax', items: [
    ['Full Face', 30, 380], ['Full Bikini (Front & Back)', 45, 400], ['Hollywood', 45, 380],
    ['Brazilian', 40, 280], ['Basic Bikini', 30, 230], ['Underarm', 15, 190],
    ['Upper Lip', 10, 100], ['Chin', 10, 100]] },
  { who: 'laurel', cat: 'Brow & Lashes', items: [
    ['Brow Lamination', 45, 380, 'Includes shape & tint'], ['Lash Lift', 60, 550, 'Includes tint'],
    ['Lash Tint', 20, 110], ['Brow Tint', 15, 100], ['Brow Shape & Tint', 30, 210]] },
  { who: 'laurel', cat: 'Plasma Skin Tag Removal', items: [
    ['Skin Tag Removal (per tag)', 30, 180], ['Large Area (per session)', 60, 1200]] },
  { who: 'laurel', cat: 'Facial Combos', items: [
    ['Deep Cleanse', 75, 950, 'Cleanse, exfoliation, extractions, purifying mask, aftercare and protect with Brow Shape & Tint'],
    ['Glow Reset', 75, 1250, 'Dermaplane with Brow Shape & Tint, Neck & Shoulder Massage & Jelly Mask'],
    ['Collagen Boost', 90, 1900, 'Dermapen Full Face with Dermaplane, Brow Shape & Tint and Neck & Shoulder Massage']] },
  { who: 'laurel', cat: 'Facial Peels', items: [
    ['Regima Initiation Peel', 45, 850, 'Brightens, renews and improves texture'],
    ['Regima Rapid Rejuvo', 45, 850, 'Targets fine lines, sun damage and dull skin'],
    ['Regima Acne Attack', 45, 850, 'Deep cleanse and controls breakouts'],
    ['Regima Double Whammy', 60, 1150, 'Powerful combination for stubborn concerns'],
    ['Regima Power Peel 30', 45, 850, 'Advanced exfoliation and rejuvenation'],
    ['Regima Power Peel 50', 45, 850, 'Intensive resurfacing for significant results'],
    ['Essel Aesthet Peel', 45, 850, 'Revitalises, smooths and brightens the skin'],
    ['Essel Retinol Peel', 45, 950, 'Powerful renewal peel. You will have visible shedding, so please plan around upcoming events.'],
    ['Dr K Cherry Peel', 45, 850, 'Brightening and antioxidant repair'],
    ['Dr K Pumpkin Peel', 45, 850, 'Exfoliates, refines and rejuvenates']] },
  { who: 'laurel', cat: 'Hands & Feet', items: [
    ['Manicure (Basic)', 45, 280], ['Gelish Hands', 45, 350],
    ['Gel Toes (Colour)', 45, 340], ['Gel Toes (French)', 50, 360],
    ['Pedi Lux', 60, 420, 'Exfoliation, nail care, massage and hydration'],
    ['Medi Heel Pedi', 75, 475, 'Includes Mediheel treatment, exfoliation, nail care, massage and hydration']] },
  { who: 'laurel', cat: 'Massage', items: [['Back & Neck Massage', 30, 400]] },
  { who: 'laurel', cat: 'Add On Menu', items: [
    ['Add on Peel', 20, 380, '', A], ['Add on Dermaplane', 15, 220, '', A], ['Add on Jelly Mask', 15, 150, '', A],
    ['Add on Neck Massage', 20, 380, '', A], ['Add on Décolleté', 20, 380, '', A], ['Add on Gelish', 30, 220, '', A]] },

  { who: 'symm', cat: 'Gel Polish', note: 'Soaked off before each new application', items: [
    ['Gel Polish Hands (Colour)', 45, 350], ['Gel Polish Hands (French)', 50, 370],
    ['Gel Polish Toes (Colour)', 45, 340], ['Gel Polish Toes (French)', 50, 360],
    ['Gel Removal Before New Set (Hands)', 15, 100, '', A], ['Gel Removal Before New Set (Toes)', 15, 60, '', A],
    ['Product Removal Only', 30, 200, 'Includes neatening up of nails']] },
  { who: 'symm', cat: 'Rubber Base (Nele & Glam Pro)', note: 'Can be filled and does not need to be removed before each new session', items: [
    ['Rubber Base Natural Overlay New Set (Hands)', 60, 460],
    ['Rubber Base Fill (Natural)', 60, 460], ['Rubber Base Fill (Colour / French / Ombre)', 75, 480]] },
  { who: 'symm', cat: 'Builder Gel (Nele & LCN)', note: 'Strength like acrylic, flexibility like gel. Ideal for weak and longer nails. Can be filled and does not need to be removed before each new set', items: [
    ['Builder Gel Natural Overlay New Set (Hands)', 75, 500], ['Builder Gel Natural Full Set Tips', 90, 520],
    ['Builder Gel Fill (Natural)', 75, 500], ['Builder Gel Fill (Colour / French / Ombre)', 90, 520]] },
  { who: 'symm', cat: 'Acrylic', note: 'Can be filled. Soak off and new application required when needed', items: [
    ['Acrylic Natural Overlay', 75, 450], ['Acrylic Natural Full Set Tips', 90, 470],
    ['Acrylic Natural Fill', 75, 450], ['Acrylic Fill (Colour / French / Ombre)', 90, 470]] },
  { who: 'symm', cat: 'Hand & Feet Care', items: [
    ['Basic Manicure', 45, 280], ['Full Pedicure', 60, 420, 'Does not include gel']] },
  { who: 'symm', cat: 'Add Ons', items: [
    ['Add On Colour / French / Ombre', 15, 120, 'For rubber base, builder gel or acrylic', A],
    ['Add On Gel Polish', 30, 220, 'With a manicure or pedicure', A],
    ['Nail Art (per nail)', 10, 5, 'R5 to R25 per nail, depending on the design', A],
    ['Nail Repair (per nail)', 10, 80, '', A]] },
];

// Flat list with a running sort order.
export const menuItems = () => MENU.flatMap(g => g.items.map(([name, mins, price, desc = '', addon = false]) =>
  ({ who: g.who, cat: g.cat, name, mins, price, desc, addon }))).map((s, i) => ({ ...s, sort: i }));
export const catNotes = () => Object.fromEntries(MENU.filter(g => g.note).map(g => [g.cat, g.note]));
