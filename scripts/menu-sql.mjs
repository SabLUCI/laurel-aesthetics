// Prints SQL that loads the printed menus from src/menu.js. Used by supabase/seed.sql and supabase/menu-update.sql.
// Usage: node scripts/menu-sql.mjs
import { menuItems, catNotes, POLICY, MENU_NOTE } from '../src/menu.js';

const q = s => `'${String(s).replace(/'/g, "''")}'`;
const rows = menuItems().map(m =>
  `  (${q(m.name)},${q(m.cat)},${m.mins},${m.price},${q(m.desc)},${m.addon},${m.sort},${q(m.who)})`).join(',\n');
const settings = JSON.stringify({ policy: POLICY, menuNote: MENU_NOTE, catNotes: catNotes() });

console.log(`insert into public.services (name, cat, mins, price, description, addon, sort, provider_id)
select m.name, m.cat, m.mins, m.price, m.description, m.addon, m.sort,
  (select id from public.providers where external = (m.who = 'symm') order by sort limit 1)
from (values
${rows}
) as m(name, cat, mins, price, description, addon, sort, who);

update public.studio set settings = settings || ${q(settings)}::jsonb where id = 1;`);
