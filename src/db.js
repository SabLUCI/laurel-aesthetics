// Supabase data layer. Without VITE_SUPABASE_URL the app runs as an on-device demo.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const sb = url && key ? createClient(url, key) : null;
export const aiChat = import.meta.env.VITE_AI_CHAT === 'on';

const COLS = {
  providers: ['id', 'name', 'role', 'external', 'sort'],
  services: ['id', 'name', 'cat', 'mins', 'price', 'provider_id', 'active', 'description', 'addon', 'sort'],
  clients: ['id', 'name', 'phone', 'email', 'notes', 'created'],
  bookings: ['id', 'client_id', 'service_id', 'provider_id', 'date', 'time', 'mins', 'status', 'paid', 'method', 'amount', 'notes', 'source'],
  expenses: ['id', 'date', 'amount', 'cat', 'supplier', 'note', 'receipt_path', 'receipt_name'],
  sales: ['id', 'date', 'amount', 'desc', 'method'],
  stock: ['id', 'name', 'qty', 'min'],
  tasks: ['id', 'text', 'due', 'done'],
  faq: ['id', 'q', 'kw', 'a', 'sort'],
};
const NULLABLE = new Set(['due', 'amount', 'receipt_path', 'client_id', 'service_id']);
const camel = k => k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const num = new Set(['amount', 'price']);

function toRow(table, o) {
  const r = {};
  for (const c of COLS[table]) {
    const v = o[camel(c)];
    if (v === undefined) continue;
    r[c] = v === '' && NULLABLE.has(c) ? null : v;
  }
  return r;
}
function fromRow(r) {
  const o = {};
  for (const k in r) o[camel(k)] = num.has(k) && r[k] !== null ? Number(r[k]) : r[k];
  if ('due' in o && o.due === null) o.due = '';
  return o;
}

export async function loadAll() {
  const names = Object.keys(COLS);
  const res = await Promise.all([
    sb.from('studio').select('settings,budget').eq('id', 1).single(),
    ...names.map(t => sb.from(t).select('*').limit(20000)),
  ]);
  const bad = res.find(r => r.error);
  if (bad) throw bad.error;
  const S = { v: 1, example: false, settings: res[0].data.settings, budget: res[0].data.budget };
  names.forEach((t, i) => { S[t] = res[i + 1].data.map(fromRow); });
  S.providers.sort((a, b) => a.sort - b.sort);
  S.faq.sort((a, b) => a.sort - b.sort);
  S.services.sort((a, b) => a.sort - b.sort);
  S.services = S.services.filter(s => s.active !== false);
  await signReceipts(S.expenses);
  return S;
}

export async function signReceipts(expenses) {
  const withFile = expenses.filter(e => e.receiptPath);
  if (!withFile.length) return;
  const { data } = await sb.storage.from('receipts').createSignedUrls(withFile.map(e => e.receiptPath), 60 * 60 * 12);
  (data || []).forEach((d, i) => { if (d.signedUrl) withFile[i].receipt = d.signedUrl; });
}

export async function put(table, obj) {
  const { error } = await sb.from(table).upsert(toRow(table, obj));
  if (error) throw error;
}
export async function remove(table, id) {
  const { error } = await sb.from(table).delete().eq('id', id);
  if (error) throw error;
}
export async function saveStudio(settings, budget) {
  const { error } = await sb.from('studio').update({ settings, budget, updated_at: new Date().toISOString() }).eq('id', 1);
  if (error) throw error;
}
export async function uploadReceipt(id, blob, ext) {
  const path = `${new Date().getFullYear()}/${id}.${ext}`;
  const { error } = await sb.storage.from('receipts').upload(path, blob, { upsert: true, contentType: blob.type });
  if (error) throw error;
  return path;
}

// Public booking page
export async function loadPublic() {
  const { data, error } = await sb.rpc('public_studio');
  if (error) throw error;
  return data;
}
export async function loadBusy(from, to) {
  const { data, error } = await sb.rpc('busy_times', { from_date: from, to_date: to });
  if (error) throw error;
  return data.map(b => ({ id: crypto.randomUUID(), providerId: b.provider_id, date: b.date, time: b.time, mins: b.mins, status: 'confirmed' }));
}
export async function requestBooking(p) {
  const args = {
    p_service: p.serviceId, p_addons: p.extras || [], p_date: p.date, p_time: p.time,
    p_name: p.name, p_phone: p.phone, p_email: p.email || '', p_notes: p.notes || '',
  };
  let { data, error } = await sb.rpc('request_booking', args);
  // Databases without the 0002 update don't know about extras yet.
  if (error?.code === 'PGRST202') {
    delete args.p_addons;
    ({ data, error } = await sb.rpc('request_booking', args));
  }
  if (error) throw error;
  return data;
}
export async function askBot(messages) {
  const { data, error } = await sb.functions.invoke('chat', { body: { messages } });
  if (error) throw error;
  return data.reply;
}

export async function isStaff() {
  const { data, error } = await sb.rpc('is_staff');
  if (error) throw error;
  return data === true;
}
export function onBookingChange(cb) {
  return sb.channel('bookings').on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, cb).subscribe();
}
