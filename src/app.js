
import * as db from './db.js';

/* ---------- helpers ---------- */
const KEY='laurel-aesthetics-v1';
const uid=()=>crypto.randomUUID();
const LIVE=!!db.sb;
const PUBLIC=location.pathname.replace(/\/+$/,'').endsWith('/book');
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const D=s=>new Date(s+'T00:00:00');
const today=()=>iso(new Date());
const addDays=(s,n)=>{const d=D(s);d.setDate(d.getDate()+n);return iso(d)};
const monthEnd=s=>{const d=D(s.slice(0,7)+'-01');d.setMonth(d.getMonth()+1);d.setDate(0);return iso(d)};
const addMonths=(ym,n)=>{const d=D(ym+'-01');d.setMonth(d.getMonth()+n);return iso(d).slice(0,7)};
const toMin=t=>{const[a,b]=t.split(':').map(Number);return a*60+b};
const fromMin=m=>`${pad(Math.floor(m/60))}:${pad(m%60)}`;
const fmtDate=s=>D(s).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short'});
const fmtLong=s=>D(s).toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const monthName=s=>D(s.slice(0,7)+'-01').toLocaleDateString('en-ZA',{month:'long',year:'numeric'});
const R=n=>'R '+Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
const R0=n=>'R '+Math.round(Number(n||0)).toLocaleString('en-ZA');
const h=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sum=a=>a.reduce((t,x)=>t+Number(x.amount||0),0);
const normPhone=p=>String(p||'').replace(/\D/g,'').replace(/^27/,'0');
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const EXP_CATS=['Rent','Stock & products','Consumables','Equipment','Marketing','Utilities & Wi-Fi','Insurance','Training','Bank fees','Other'];
const PAY=['Card','Cash','EFT','SnapScan'];

/* ---------- data ---------- */
function seed(){
  const t=today(), m0=t.slice(0,7), m1=addMonths(m0,-1), dd=+t.slice(8,10);
  const day=(ym,d)=>`${ym}-${pad(ym===m0?Math.min(d,dd):d)}`;
  const providers=[
    {id:'p1',name:'Laurel Aesthetics',role:'Skin & beauty treatments',external:false},
    {id:'p2',name:'Symm',role:'Nail technician (rents the space)',external:true}];
  const services=[
    ['Signature facial','Facials',60,650,'p1'],['Express hydrating facial','Facials',30,380,'p1'],
    ['Dermaplaning','Skin treatments',45,550,'p1'],['Chemical peel','Skin treatments',45,750,'p1'],
    ['Microneedling','Skin treatments',75,1200,'p1'],['Lash lift & tint','Lashes & brows',60,480,'p1'],
    ['Brow lamination & tint','Lashes & brows',45,420,'p1'],['Full leg wax','Waxing',45,380,'p1'],
    ['Underarm wax','Waxing',15,120,'p1'],
    ['Rubber base overlay','Nails with Symm',60,320,'p2'],['Gel polish (hands)','Nails with Symm',45,250,'p2'],
    ['Builder gel (BIAB)','Nails with Symm',75,380,'p2'],['Classic French add-on','Nails with Symm',15,60,'p2']
  ].map(([name,cat,mins,price,providerId])=>({id:uid(),name,cat,mins,price,providerId}));
  const clients=[
    ['Anika van der Merwe','082 555 0141','Sensitive skin. Prefers fragrance-free products.'],
    ['Lerato Mokoena','071 555 0192','Monthly facial. Likes Saturday mornings.'],
    ['Chantelle Botha','083 555 0127','Allergic to lash glue brand X: patch test first.'],
    ['Priya Naidoo','084 555 0163',''],
    ['Zanele Dlamini','072 555 0188','Pregnant (due Feb). No peels or microneedling.'],
    ['Mia Pretorius','079 555 0105','Lives in the estate, walks over.'],
    ['Tanya Swanepoel','076 555 0134','']
  ].map(([name,phone,notes])=>({id:uid(),name,phone,email:'',notes,created:addDays(t,-40)}));
  let r=11;const rnd=()=>{r=(r*9301+49297)%233280;return r/233280};
  const times=['08:30','10:00','11:30','13:00','14:30','15:45'];
  const bookings=[];
  for(let d=-26;d<=12;d++){
    const date=addDays(t,d),dow=D(date).getDay(); if(dow===0) continue;
    const n=dow===6?2:1+Math.floor(rnd()*3), used=new Set();
    for(let k=0;k<n;k++){
      const s=services[Math.floor(rnd()*services.length)];
      const time=times[Math.floor(rnd()*(dow===6?3:times.length))];
      if(used.has(time+s.providerId)) continue; used.add(time+s.providerId);
      const c=clients[Math.floor(rnd()*clients.length)];
      const status=d<0?(rnd()<.07?'noshow':'done'):d===0?'confirmed':(rnd()<.22?'requested':'confirmed');
      bookings.push({id:uid(),clientId:c.id,serviceId:s.id,providerId:s.providerId,date,time,status,
        paid:status==='done',method:status==='done'?PAY[Math.floor(rnd()*4)]:'',amount:s.price,notes:'',source:rnd()<.5?'online':'studio'});
    }
  }
  const E=(date,amount,cat,supplier,note='')=>({id:uid(),date,amount,cat,supplier,note,receipt:null,receiptName:''});
  const expenses=[
    E(day(m1,1),6500,'Rent','Treatment room rental'),E(day(m1,3),3200,'Stock & products','Professional skincare supplier','Cleansers, serums, peel solution'),
    E(day(m1,9),599,'Utilities & Wi-Fi','Fibre Wi-Fi'),E(day(m1,15),850,'Consumables','Beauty wholesaler','Gloves, cotton, wax strips'),
    E(day(m1,20),450,'Marketing','Flyer printing'),E(day(m1,25),380,'Insurance','Business insurance'),
    E(day(m0,1),6500,'Rent','Treatment room rental'),E(day(m0,8),1120,'Consumables','Beauty wholesaler'),
    E(day(m0,10),599,'Utilities & Wi-Fi','Fibre Wi-Fi'),E(day(m0,14),2450,'Stock & products','Professional skincare supplier'),
    E(day(m0,18),900,'Training','Lash lift course deposit')];
  const sales=[
    {id:uid(),date:day(m1,1),amount:2500,desc:'Space rental: Symm',method:'EFT'},
    {id:uid(),date:day(m0,1),amount:2500,desc:'Space rental: Symm',method:'EFT'},
    {id:uid(),date:day(m0,12),amount:420,desc:'Retail: hydrating serum',method:'Card'}];
  return {
    v:1, example:true,
    settings:{business:'Laurel Aesthetics',tagline:"It's all about you",address:'Silver Lakes Golf Estate, Pretoria East',
      whatsapp:'',email:'',vatThreshold:1000000,slotStep:30,
      hours:[null,['08:00','17:00'],['08:00','17:00'],['08:00','17:00'],['08:00','17:00'],['08:00','17:00'],['08:00','13:00']]},
    budget:{'Rent':6500,'Stock & products':4000,'Consumables':1200,'Equipment':500,'Marketing':800,'Utilities & Wi-Fi':700,'Insurance':400,'Training':1000,'Bank fees':150,'Other':300},
    providers,services,clients,bookings,expenses,sales,
    stock:[
      {id:uid(),name:'Gentle cleanser 500 ml',qty:3,min:2},{id:uid(),name:'Enzyme peel',qty:1,min:2},
      {id:uid(),name:'Hard wax beads 1 kg',qty:2,min:1},{id:uid(),name:'Lash lift kit',qty:1,min:1},
      {id:uid(),name:'Nitrile gloves (box)',qty:1,min:2},{id:uid(),name:'Cotton pads (pack)',qty:5,min:3}],
    tasks:[
      {id:uid(),text:'Order gloves and enzyme peel',due:addDays(t,1),done:false},
      {id:uid(),text:'Post December specials on Instagram',due:addDays(t,5),done:false},
      {id:uid(),text:"Send Symm her November rental invoice",due:addDays(t,10),done:false},
      {id:uid(),text:'Ask accountant about provisional tax (IRP6)',due:addDays(t,14),done:false},
      {id:uid(),text:'Register on SARS eFiling',due:addDays(t,-5),done:true}],
    faq:[
      {id:uid(),q:'What are your opening hours?',kw:'hours open close closing time saturday sunday weekend when oop ure',a:'{{hours}}'},
      {id:uid(),q:'Where are you?',kw:'where location address find directions silver lakes estate gate access parking',a:"We're inside Silver Lakes Golf Estate, Pretoria East. It's a secure estate, so please bring your ID and give your name at the gate. We'll register you as a visitor once your booking is confirmed."},
      {id:uid(),q:'How much does it cost?',kw:'price prices cost costs much menu rate rates hoeveel prys',a:'{{prices}}'},
      {id:uid(),q:'How can I pay?',kw:'pay payment card cash eft snapscan',a:'We accept card, cash, EFT and SnapScan. Payment is due after your treatment.'},
      {id:uid(),q:'What is your cancellation policy?',kw:'cancel cancellation reschedule late move change postpone',a:"Please give us at least 24 hours' notice to cancel or move your appointment. Late cancellations and no-shows may be charged 50% of the treatment price."},
      {id:uid(),q:'How do I prepare for a facial or peel?',kw:'prepare preparation before facial peel retinol makeup',a:'Come with a clean face if you can. For a peel, dermaplaning or microneedling, stop retinol and exfoliating acids 3 to 5 days before, and avoid waxing the area.'},
      {id:uid(),q:'Can I have treatments while pregnant?',kw:'pregnant pregnancy breastfeeding',a:"Gentle facials are usually fine, but most peels and microneedling aren't recommended while pregnant or breastfeeding. Please mention it when you book so we can suggest the right treatment."},
      {id:uid(),q:'Do you sell gift vouchers?',kw:'voucher vouchers gift present birthday',a:"Yes. Gift vouchers are available for any treatment or amount. Ask us and we'll set one up for you."},
      {id:uid(),q:'Can men book treatments?',kw:'men man male guys husband boyfriend',a:'Yes, everyone is welcome. Facials, skin treatments, brows and waxing are all available to men.'},
      {id:uid(),q:'Do you do nails?',kw:'nails nail gel rubber builder biab french manicure symm',a:'Nails are done in the same space by Symm, our resident nail technician. You can book her treatments here too.'}]
  };
}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));return s&&s.v===1?s:null}catch(e){return null}}
let S=LIVE?{v:1,example:false,settings:{business:'Laurel Aesthetics',address:'Silver Lakes Golf Estate, Pretoria East',hours:[],whatsapp:''},budget:{},providers:[],services:[],clients:[],bookings:[],expenses:[],sales:[],stock:[],tasks:[],faq:[]}:(load()||seed());
function save(){if(LIVE)return;try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('This device ran out of storage. Remove some receipt photos and try again.')}}
// Live mode: write one record to Supabase in the background; on failure reload so the screen matches the database.
function sync(table,obj){if(!LIVE)return;db.put(table,obj).catch(err=>{console.error(err);toast("Couldn't save that. Check your connection and try again.");reloadLive()})}
function drop(table,id){if(!LIVE)return;db.remove(table,id).catch(err=>{console.error(err);toast("Couldn't delete that. Check your connection.");reloadLive()})}
function syncStudio(){if(!LIVE)return;db.saveStudio(S.settings,S.budget).catch(err=>{console.error(err);toast("Couldn't save settings.");reloadLive()})}
async function reloadLive(){try{S=await db.loadAll();render()}catch(e){console.error(e)}}

const U={auth:LIVE&&!PUBLIC?'checking':'ok',loading:LIVE,mode:PUBLIC?'client':'owner',view:'today',diaryDate:today(),month:today().slice(0,7),q:'',studio:'services',ctab:'book',
  book:{svc:null,date:null,time:null,done:null},chat:[]};
if(location.hash==='#book'){U.mode='client'}
const bookingLink=()=>LIVE?`${location.origin}/book`:'';
if(location.hash==='#chat'){U.mode='client';U.ctab='chat'}

const svc=id=>S.services.find(x=>x.id===id);
const client=id=>S.clients.find(x=>x.id===id);
const prov=id=>S.providers.find(x=>x.id===id);
const live=b=>!['cancelled','declined','noshow'].includes(b.status);
const byDT=(a,b)=>(a.date+a.time).localeCompare(b.date+b.time);

function incomeItems(from,to){
  const out=[];
  for(const b of S.bookings){
    if(b.date<from||b.date>to||b.status!=='done'||!b.paid) continue;
    const p=prov(b.providerId); if(p&&p.external) continue;
    out.push({date:b.date,amount:Number(b.amount??svc(b.serviceId)?.price??0),desc:`${svc(b.serviceId)?.name||'Treatment'} · ${client(b.clientId)?.name||'Client'}`,method:b.method||'',kind:'booking',id:b.id});
  }
  for(const s of S.sales) if(s.date>=from&&s.date<=to) out.push({...s,kind:'sale'});
  return out.sort((a,b)=>b.date.localeCompare(a.date));
}
const expensesIn=(from,to)=>S.expenses.filter(e=>e.date>=from&&e.date<=to).sort((a,b)=>b.date.localeCompare(a.date));

function slotsFor(date,s,ignoreId){
  const hrs=S.settings.hours[D(date).getDay()]; if(!hrs) return [];
  const open=toMin(hrs[0]),close=toMin(hrs[1]),step=Number(S.settings.slotStep)||30;
  const busy=S.bookings.filter(b=>b.id!==ignoreId&&b.date===date&&b.providerId===s.providerId&&live(b))
    .map(b=>{const st=toMin(b.time);return[st,st+(b.mins||svc(b.serviceId)?.mins||60)]});
  const n=new Date(), nowMin=date===today()?n.getHours()*60+n.getMinutes()+60:-1, out=[];
  for(let t=open;t+s.mins<=close;t+=step){
    if(t<nowMin) continue;
    if(busy.some(([a,b])=>t<b&&t+s.mins>a)) continue;
    out.push(fromMin(t));
  }
  return out;
}

/* SA tax helpers (estimates only) */
function taxYear(s){const y=+s.slice(0,4),m=+s.slice(5,7),sy=m>=3?y:y-1;return{start:`${sy}-03-01`,end:addDays(`${sy+1}-03-01`,-1),label:`${sy}/${String(sy+1).slice(2)}`,endYear:sy+1}}
function saTax(x){ // 2025/26 SARS individual tables, under-65 primary rebate
  const B=[[237100,0,.18],[370500,42678,.26],[512800,77362,.31],[673000,121475,.36],[857900,179147,.39],[1817000,251258,.41],[Infinity,644489,.45]];
  let lo=0,t=0;for(const[hi,base,rate] of B){if(x<=hi){t=base+(x-lo)*rate;break}lo=hi}
  return Math.max(0,t-17235);
}

/* ---------- small UI pieces ---------- */
const ICONS={
  today:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  diary:'<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  clients:'<svg viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M15.5 5.2a3.4 3.4 0 0 1 0 6.6M18 14.8c1.8.7 3 2.4 3.5 5.2"/></svg>',
  money:'<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12.5" rx="2.5"/><circle cx="12" cy="12.25" r="2.6"/><path d="M6 9.5v5.5M18 9.5v5.5"/></svg>',
  tax:'<svg viewBox="0 0 24 24"><path d="M6 2.5h9l4 4V21.5H6z"/><path d="M15 2.5v4h4M9 11h7M9 14.5h7M9 18h4"/></svg>',
  studio:'<svg viewBox="0 0 24 24"><path d="M12 21c-4.5-2.6-7-6.2-7-10.2C5 6.6 8.2 3.5 12 3c3.8.5 7 3.6 7 7.8 0 4-2.5 7.6-7 10.2z"/><path d="M12 7v14"/></svg>'};
const logo=(cls='')=>`<span class="logo ${cls}" aria-label="Laurel Aesthetics"><span class="lw">La<span class="lu">u</span>rel</span><span class="la">AESTHETICS</span><span class="lt">IT'S ALL ABOUT YOU</span></span>`;
const leaf=(cls='')=>`<svg class="leaf ${cls}" viewBox="0 0 160 120" aria-hidden="true" fill="none" stroke="var(--gold)" stroke-width="1.1" stroke-linecap="round">
  <path d="M6 116C46 92 86 70 150 22"/>
  <path d="M40 96c-6-16-2-30 10-40 4 16 0 30-10 40z"/><path d="M40 96c3-12 6-24 10-40"/>
  <path d="M70 76c-2-18 6-32 20-38 0 18-6 30-20 38z"/><path d="M70 76c5-13 11-26 20-38"/>
  <path d="M100 56c2-18 12-28 28-30-4 16-14 26-28 30z"/><path d="M100 56c9-11 18-21 28-30"/>
  <path d="M58 86c16 4 30 0 40-10-16-4-30 0-40 10z"/><path d="M88 66c16 2 28-4 36-14-16-2-28 4-36 14z"/></svg>`;
const pill=s=>`<span class="pill ${s}">${({requested:'Request',confirmed:'Confirmed',done:'Done',cancelled:'Cancelled',noshow:'No-show',declined:'Declined'})[s]||s}</span>`;
const btn=(label,act,id='',cls='')=>`<button class="btn sm ${cls}" data-act="${act}" data-id="${id}">${label}</button>`;
const kpi=(label,val,sub,neg)=>`<div class="kpi"><span class="eyebrow">${label}</span><b class="${neg?'neg':''}">${val}</b><span class="sub">${sub||'&nbsp;'}</span></div>`;
const panel=(title,body,action='')=>`<section class="panel"><div class="ph"><h3>${title}</h3>${action}</div>${body}</section>`;
function toast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2600)}

function bookingRow(b,showDate){
  const s=svc(b.serviceId)||{name:'Treatment',mins:60},c=client(b.clientId)||{name:'Client'},p=prov(b.providerId);
  let acts='';
  if(b.status==='requested') acts=btn('Confirm','confirm',b.id,'pri')+btn('Decline','decline',b.id);
  else if(b.status==='confirmed') acts=btn('Done &amp; paid','pay',b.id,'pri')+btn('No-show','noshow',b.id);
  else if(b.status==='done'&&!b.paid) acts=btn('Mark paid','pay',b.id,'pri');
  return `<div class="bk"><div class="bk-t"><b>${b.time}</b><span>${s.mins} min</span></div>
  <div style="min-width:0"><button class="linkish" data-act="clientOpen" data-id="${c.id||''}">${h(c.name)}</button>
  <div class="sub"><span class="dot ${p&&p.external?'ext':''}"></span>${h(s.name)} · ${h(p?.name||'')}${showDate?' · '+fmtDate(b.date):''}${b.source==='online'?' · booked online':''}</div>
  ${b.notes?`<div class="sub">“${h(b.notes)}”</div>`:''}</div>
  <div class="bk-a"><div class="row">${pill(b.status)}${b.paid?`<span class="pill paid">Paid ${h(b.method)}</span>`:''}</div><div class="row">${acts}${btn('Edit','editBooking',b.id,'ghost')}</div></div></div>`;
}

/* ---------- owner views ---------- */
function vToday(){
  const t=today(),m0=t.slice(0,7)+'-01',mE=monthEnd(t);
  const inc=sum(incomeItems(m0,mE)),exp=sum(expensesIn(m0,mE));
  const todays=S.bookings.filter(b=>b.date===t&&live(b)).sort(byDT);
  const reqs=S.bookings.filter(b=>b.status==='requested').sort(byDT);
  const week=S.bookings.filter(b=>b.date>t&&b.date<=addDays(t,7)&&live(b));
  const weekVal=week.filter(b=>!prov(b.providerId)?.external).reduce((a,b)=>a+Number(b.amount||0),0);
  const low=S.stock.filter(x=>x.qty<=x.min);
  const tasks=S.tasks.filter(x=>!x.done).sort((a,b)=>(a.due||'9').localeCompare(b.due||'9')).slice(0,5);
  const budTotal=Object.values(S.budget).reduce((a,b)=>a+Number(b||0),0);
  const hr=new Date().getHours(),greet=hr<12?'Good morning':hr<17?'Good afternoon':'Good evening';
  const ty=taxYear(t),prov2=`${ty.endYear}-02-28`;
  return `<div class="pagehead"><div><p class="script greet">${greet}</p><h1>${fmtLong(t)}</h1></div>
    <div class="row">${LIVE?'<button class="btn" data-act="copyLink">Copy booking link</button>':''}<button class="btn pri" data-act="newBooking">+ New booking</button></div></div>
  <div class="kpis">
    ${kpi('Today',`${todays.length} booking${todays.length===1?'':'s'}`,todays.length?`First at ${todays[0].time}`:'Nothing booked yet')}
    ${kpi('Income this month',R0(inc),monthName(t))}
    ${kpi('Spent this month',R0(exp),`${R0(Math.max(0,budTotal-exp))} left in budget`)}
    ${kpi('Profit this month',R0(inc-exp),inc-exp>=0?'Income minus expenses':'Expenses are ahead of income',inc-exp<0)}
  </div>
  <div class="cols"><div class="col">
    ${reqs.length?panel(`Booking requests <span class="pill requested">${reqs.length}</span>`,reqs.map(b=>bookingRow(b,true)).join('')):''}
    ${panel("Today's diary",todays.length?todays.map(b=>bookingRow(b)).join(''):'<p class="empty">No bookings today. Share your booking link so clients can request a time.</p>',btn('Open diary','nav','diary'))}
  </div><div class="col">
    ${panel('Next 7 days',`<p><b class="num" style="font:600 1.5rem var(--display)">${week.length}</b> bookings · <span class="num">${R0(weekVal)}</span> expected</p>`)}
    ${panel('Planner',`<div>${tasks.map(taskRow).join('')||'<p class="empty">All done.</p>'}</div>`,btn('All tasks','studioGo','planner','ghost'))}
    ${low.length?panel('Running low',`<div class="list">${low.map(x=>`<div class="li"><span>${h(x.name)}</span><span class="pill low">${x.qty} left</span></div>`).join('')}</div>`,btn('Stock','studioGo','stock','ghost')):''}
    ${panel('Next tax date',`<p>Second provisional tax payment (IRP6) for ${ty.label} is due by <b>${fmtDate(prov2)}</b>.</p>`,btn('Tax','nav','tax','ghost'))}
  </div></div>`;
}
function taskRow(x){return `<label class="task ${x.done?'done':''}"><input type="checkbox" data-act="taskToggle" data-id="${x.id}" ${x.done?'checked':''}><span>${h(x.text)}${x.due?`<br><small class="sub">${x.due<today()&&!x.done?'Overdue · ':''}${fmtDate(x.due)}</small>`:''}</span></label>`}

function vDiary(){
  const d=U.diaryDate,mon=addDays(d,-((D(d).getDay()+6)%7));
  const days=[...Array(7)].map((_,i)=>addDays(mon,i));
  const list=S.bookings.filter(b=>b.date===d).sort(byDT);
  const closed=!S.settings.hours[D(d).getDay()];
  return `<div class="pagehead"><div><p class="eyebrow">Diary</p><h1>${fmtLong(d)}</h1></div>
    <div class="row">${btn('‹ Week','diaryShift','-7')}${btn('Today','diaryToday')}${btn('Week ›','diaryShift','7')}<button class="btn pri" data-act="newBooking">+ New booking</button></div></div>
  <div class="days">${days.map(x=>{const n=S.bookings.filter(b=>b.date===x&&live(b)).length;
    return `<button class="day ${x===d?'on':''}" data-act="diaryDay" data-id="${x}"><small>${D(x).toLocaleDateString('en-ZA',{weekday:'short'})}</small><b>${+x.slice(8)}</b><i>${S.settings.hours[D(x).getDay()]?(n?n+' booked':'free'):'closed'}</i></button>`}).join('')}</div>
  ${S.providers.map(p=>{const bl=list.filter(b=>b.providerId===p.id);
    return panel(`<span class="dot ${p.external?'ext':''}"></span>${h(p.name)}`,bl.length?bl.map(b=>bookingRow(b)).join(''):`<p class="empty">${closed?'Closed on '+DAYS[D(d).getDay()]+'s.':'No bookings.'}</p>`,`<span class="sub">${h(p.role)}</span>`)}).join('<div style="height:14px"></div>')}`;
}

function clientStats(c){const bs=S.bookings.filter(b=>b.clientId===c.id);const done=bs.filter(b=>b.status==='done');
  return{visits:done.length,last:done.map(b=>b.date).sort().pop(),next:bs.filter(b=>b.date>=today()&&live(b)).map(b=>b.date).sort()[0],spent:done.filter(b=>b.paid).reduce((a,b)=>a+Number(b.amount||0),0)}}
function vClients(){
  const q=U.q.toLowerCase(),list=S.clients.filter(c=>!q||(c.name+' '+c.phone+' '+c.email).toLowerCase().includes(q)).sort((a,b)=>a.name.localeCompare(b.name));
  return `<div class="pagehead"><div><p class="eyebrow">Clients</p><h1>${S.clients.length} clients</h1></div><button class="btn pri" data-act="clientNew">+ Add client</button></div>
  <div style="margin-bottom:12px"><input id="clientSearch" type="search" placeholder="Search by name or phone" value="${h(U.q)}" data-input="search"></div>
  <section class="panel"><div class="tw"><table class="t"><thead><tr><th>Name</th><th>Phone</th><th class="r">Visits</th><th>Last visit</th><th>Next</th><th class="r">Spent</th></tr></thead><tbody>
  ${list.map(c=>{const s=clientStats(c);return `<tr class="click" data-act="clientOpen" data-id="${c.id}"><td><b style="font-weight:500">${h(c.name)}</b>${c.notes?'<br><span class="sub">'+h(c.notes.slice(0,48))+(c.notes.length>48?'…':'')+'</span>':''}</td><td class="num">${h(c.phone)}</td><td class="r">${s.visits}</td><td>${s.last?fmtDate(s.last):'–'}</td><td>${s.next?fmtDate(s.next):'–'}</td><td class="r">${R0(s.spent)}</td></tr>`}).join('')||'<tr><td colspan="6" class="empty">No clients match that search.</td></tr>'}
  </tbody></table></div></section>`;
}

function vMoney(){
  const m=U.month,from=m+'-01',to=monthEnd(from);
  const inc=incomeItems(from,to),exp=expensesIn(from,to),ti=sum(inc),te=sum(exp);
  const byCat={};exp.forEach(e=>byCat[e.cat]=(byCat[e.cat]||0)+Number(e.amount));
  const cats=[...new Set([...Object.keys(S.budget),...Object.keys(byCat)])];
  const missing=exp.filter(e=>!e.receipt&&!e.receiptName).length;
  return `<div class="pagehead"><div><p class="eyebrow">Money</p><h1>${monthName(from)}</h1></div>
    <div class="row">${btn('‹','monthShift','-1')}${btn('This month','monthNow')}${btn('›','monthShift','1')}
    <button class="btn" data-act="saleNew">+ Income</button><button class="btn pri" data-act="expNew">+ Expense</button></div></div>
  <div class="kpis">${kpi('Income',R0(ti),`${inc.length} payments`)}${kpi('Expenses',R0(te),`${exp.length} items`)}${kpi('Profit',R0(ti-te),'',ti-te<0)}${kpi('Receipts missing',String(missing),missing?'Add photos for SARS records':'All filed')}</div>
  <div class="cols"><div class="col">
  ${panel('Expenses',`<div class="tw"><table class="t"><thead><tr><th></th><th>Date</th><th>What</th><th>Category</th><th class="r">Amount</th><th></th></tr></thead><tbody>
    ${exp.map(e=>`<tr><td>${e.receipt?`<img class="thumb" src="${e.receipt}" alt="Receipt" data-act="receipt" data-id="${e.id}">`:e.receiptName?`<span class="nofile">PDF</span>`:`<button class="btn sm ghost" data-act="expEdit" data-id="${e.id}" title="Add receipt">＋</button>`}</td>
      <td class="num">${fmtDate(e.date)}</td><td>${h(e.supplier)}${e.note?'<br><span class="sub">'+h(e.note)+'</span>':''}</td><td>${h(e.cat)}</td><td class="r">${R(e.amount)}</td><td>${btn('Edit','expEdit',e.id,'ghost')}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No expenses this month.</td></tr>'}
    </tbody></table></div>`)}
  ${panel('Income',`<div class="tw"><table class="t"><thead><tr><th>Date</th><th>What</th><th>Paid by</th><th class="r">Amount</th></tr></thead><tbody>
    ${inc.map(i=>`<tr><td class="num">${fmtDate(i.date)}</td><td>${h(i.desc)}</td><td>${h(i.method)}</td><td class="r">${R(i.amount)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">No income recorded this month.</td></tr>'}
    </tbody></table></div><p class="sub" style="margin-top:8px">Treatments count as income once marked done and paid. Symm's own nail income is not counted; her rent is.</p>`)}
  </div><div class="col">
  ${panel('Budget',`<div class="bud">${cats.map(c=>{const b=Number(S.budget[c]||0),a=byCat[c]||0,pc=b?Math.min(100,a/b*100):(a?100:0);
    return `<div><div class="bl"><span>${h(c)}</span><span class="num ${a>b?'':'muted'}">${R0(a)} / ${R0(b)}</span></div><div class="bar"><i class="${a>b?'over':''}" style="width:${pc}%"></i></div></div>`}).join('')}</div>`,btn('Edit budget','budgetEdit','','ghost'))}
  </div></div>`;
}

function vTax(){
  const t=today(),ty=taxYear(t),inc=incomeItems(ty.start,t),exp=expensesIn(ty.start,t);
  const ti=sum(inc),te=sum(exp),profit=ti-te;
  const first=[...S.bookings.filter(b=>b.status==='done').map(b=>b.date),...S.expenses.map(e=>e.date),...S.sales.map(s=>s.date)].filter(x=>x>=ty.start).sort()[0]||t;
  const months=Math.max(1,(D(t)-D(first))/(30.44*864e5));
  const projected=Math.max(0,profit/months*Math.min(12,(D(ty.end)-D(first))/(30.44*864e5)));
  const estTax=saTax(projected);
  const roll=sum(incomeItems(addDays(t,-365),t)),vt=Number(S.settings.vatThreshold)||1000000,vp=Math.min(100,roll/vt*100);
  const missing=exp.filter(e=>!e.receipt&&!e.receiptName).length;
  const dates=[[`${ty.endYear-1}-08-31`,'First provisional tax payment (IRP6)'],[`${ty.endYear}-02-28`,'Second provisional tax payment (IRP6)'],[`${ty.endYear}-09-30`,'Optional top-up payment (IRP6)']];
  return `<div class="pagehead"><div><p class="eyebrow">Tax year ${ty.label} · 1 Mar ${ty.endYear-1} to 28 Feb ${ty.endYear}</p><h1>Tax &amp; SARS</h1></div><button class="btn pri" data-act="copyCsv">Copy records for accountant</button></div>
  <div class="kpis">${kpi('Income so far',R0(ti),'This tax year')}${kpi('Expenses so far',R0(te),`${exp.length} items · ${missing} without receipt`)}${kpi('Profit so far',R0(profit),'',profit<0)}${kpi('Rough tax on the year',R0(estTax),`On ${R0(projected)} projected profit`)}</div>
  <div class="cols"><div class="col">
  ${panel('Key dates',`<div class="list">${dates.map(([d,l])=>`<div class="li"><div><b style="font-weight:500">${l}</b><div class="sub">${fmtLong(d)}</div></div>${d<t?'<span class="pill cancelled">Passed</span>':`<span class="pill requested">${Math.ceil((D(d)-D(t))/864e5)} days</span>`}</div>`).join('')}</div>`)}
  ${panel('Set aside for tax',`<p>Putting away about <b class="num">${R0(estTax/12)}</b> a month covers the rough estimate. The figure uses SARS's 2025/26 personal income tax tables for a sole proprietor under 65, after the primary rebate, and treats every expense here as deductible.</p>
    <p class="sub" style="margin-top:8px">This is a planning guide, not tax advice. Check it with a registered tax practitioner before paying SARS.</p>`)}
  </div><div class="col">
  ${panel('VAT registration',`<p class="num">${R0(roll)} turnover in the last 12 months</p><div class="bar" style="height:10px;margin:8px 0"><i style="width:${vp}%"></i></div>
    <p class="sub">Registration becomes compulsory once 12-month turnover passes ${R0(vt)}. Change the threshold in Studio › Settings if SARS updates it.</p>`)}
  ${panel('Turnover tax',`<p class="sub" style="color:var(--cocoa)">While turnover stays under R1 million a year, ask your accountant whether SARS Turnover Tax is simpler for you. It replaces income tax and VAT with one small tax on turnover.</p>`)}
  </div></div>`;
}

function vStudio(){
  const tabs=[['services','Services & prices'],['stock','Stock'],['planner','Planner'],['faq','Chatbot answers'],['settings','Settings']];
  let body='';
  if(U.studio==='services'){
    const cats=[...new Set(S.services.map(s=>s.cat))];
    body=panel('Services & prices',cats.map(c=>`<p class="cat">${h(c)}</p><div class="list">${S.services.filter(s=>s.cat===c).map(s=>`<div class="li"><div><b style="font-weight:500">${h(s.name)}</b><div class="sub">${s.mins} min · ${h(prov(s.providerId)?.name||'')}</div></div><div class="row"><span class="num">${R0(s.price)}</span>${btn('Edit','svcEdit',s.id,'ghost')}</div></div>`).join('')}</div>`).join(''),btn('+ Add service','svcNew','','pri'));
  }else if(U.studio==='stock'){
    body=panel('Stock',`<div class="list">${S.stock.map(x=>`<div class="li"><div><b style="font-weight:500">${h(x.name)}</b><div class="sub">Reorder at ${x.min}</div></div><div class="row">${x.qty<=x.min?'<span class="pill low">Low</span>':''}<span class="stockq">${btn('−','stockAdj',x.id+':-1')}<b>${x.qty}</b>${btn('+','stockAdj',x.id+':1')}</span>${btn('Edit','stockEdit',x.id,'ghost')}</div></div>`).join('')}</div>`,btn('+ Add item','stockEdit','','pri'));
  }else if(U.studio==='planner'){
    const open=S.tasks.filter(x=>!x.done).sort((a,b)=>(a.due||'9').localeCompare(b.due||'9')),done=S.tasks.filter(x=>x.done);
    body=panel('Planner',`<form data-form="task" class="row" style="margin-bottom:10px"><input name="text" placeholder="Add a task, e.g. Order wax strips" required><input name="due" type="date" style="max-width:160px"><button class="btn pri">Add</button></form>
      ${open.map(x=>`<div class="row" style="justify-content:space-between;flex-wrap:nowrap">${taskRow(x)}${btn('Remove','taskDel',x.id,'ghost')}</div>`).join('')||'<p class="empty">Nothing on the list.</p>'}
      ${done.length?`<p class="cat">Done</p>${done.map(x=>`<div class="row" style="justify-content:space-between;flex-wrap:nowrap">${taskRow(x)}${btn('Remove','taskDel',x.id,'ghost')}</div>`).join('')}`:''}`);
  }else if(U.studio==='faq'){
    body=`<p class="note" style="margin-bottom:14px">These are draft answers for the client chat. They are placeholders until the chatbot wording is agreed. <b>{{hours}}</b> and <b>{{prices}}</b> fill in automatically from your settings and price list.</p>`+
    panel('Chatbot answers',`<div class="list">${S.faq.map(f=>`<div class="li"><div><b style="font-weight:500">${h(f.q)}</b><div class="sub">${h(f.a.slice(0,110))}${f.a.length>110?'…':''}</div></div>${btn('Edit','faqEdit',f.id,'ghost')}</div>`).join('')}</div>`,btn('+ Add answer','faqEdit','','pri'));
  }else{
    const st=S.settings;
    body=`<form data-form="settings" class="fg">${panel('Business',`<div class="fg"><div class="g2">
      <label class="f">Business name<input name="business" value="${h(st.business)}"></label>
      <label class="f">WhatsApp number for clients<input name="whatsapp" value="${h(st.whatsapp)}" placeholder="e.g. 082 000 0000"></label></div>
      <label class="f">Address<input name="address" value="${h(st.address)}"></label>
      <div class="g2"><label class="f">Email<input name="email" type="email" value="${h(st.email)}"></label>
      <label class="f">VAT threshold (R)<input name="vatThreshold" type="number" min="0" value="${h(st.vatThreshold)}"></label></div></div>`)}
    ${panel('Opening hours',`<div class="fg">${[1,2,3,4,5,6,0].map(i=>{const hr=st.hours[i];return `<div class="g3"><label class="check"><input type="checkbox" name="open${i}" ${hr?'checked':''}> ${DAYS[i]}</label><input type="time" name="from${i}" value="${hr?hr[0]:'08:00'}" aria-label="${DAYS[i]} opens"><input type="time" name="to${i}" value="${hr?hr[1]:'17:00'}" aria-label="${DAYS[i]} closes"></div>`}).join('')}
      <label class="f">Booking slots every<select name="slotStep">${[15,30,45,60].map(n=>`<option value="${n}" ${+st.slotStep===n?'selected':''}>${n} minutes</option>`).join('')}</select></label></div>`)}
    ${panel('People working in the space',`<div class="fg">${S.providers.map(p=>`<div class="g2"><label class="f">Name<input name="pname_${p.id}" value="${h(p.name)}"></label><label class="f">Role<input name="prole_${p.id}" value="${h(p.role)}"></label>
      <label class="check" style="grid-column:1/-1"><input type="checkbox" name="pext_${p.id}" ${p.external?'checked':''}> Runs her own business here (her treatment income isn't counted as yours)</label></div>`).join('<hr style="border:0;border-top:1px solid var(--line);width:100%">')}</div>`)}
    <div class="row"><button class="btn pri">Save settings</button>${S.example?'<button type="button" class="btn danger" data-act="resetAsk">Clear example data</button>':''}${LIVE?'<button type="button" class="btn" data-act="logout">Sign out</button>':''}</div></form>`;
  }
  return `<div class="pagehead"><div><p class="eyebrow">Studio</p><h1>Run the studio</h1></div></div>
  <div class="subtabs">${tabs.map(([k,l])=>`<button class="${U.studio===k?'on':''}" data-act="studioTab" data-id="${k}">${l}</button>`).join('')}</div>${body}`;
}

/* ---------- client views ---------- */
function hoursText(){
  const st=S.settings.hours,groups=[];
  [1,2,3,4,5,6,0].forEach(i=>{const k=st[i]?st[i].join('–'):'Closed',g=groups[groups.length-1];if(g&&g.k===k)g.days.push(i);else groups.push({k,days:[i]})});
  return 'Our hours:\n'+groups.map(g=>`${DAYS[g.days[0]]}${g.days.length>1?' to '+DAYS[g.days[g.days.length-1]]:''}: ${g.k}`).join('\n');
}
function pricesText(){const cats=[...new Set(S.services.map(s=>s.cat))];
  return cats.map(c=>`${c}\n`+S.services.filter(s=>s.cat===c).map(s=>`• ${s.name}: ${R0(s.price)}`).join('\n')).join('\n\n')}

function vClient(){
  return `<section class="hero">${leaf()}${leaf('r')}${logo('lg')}<p class="loc">${h(S.settings.address)}</p></section>
  <div class="ctabs"><div class="seg"><button class="${U.ctab==='book'?'on':''}" data-act="ctab" data-id="book">Book a treatment</button><button class="${U.ctab==='chat'?'on':''}" data-act="ctab" data-id="chat">Ask a question</button></div></div>
  <div class="cwrap">${U.ctab==='book'?vBook():vChat()}</div>
  <p class="foot">${h(S.settings.business)} · ${h(S.settings.address)}</p>`;
}
function vBook(){
  const B=U.book;
  if(B.done){const s=svc(B.done.serviceId);
    return `<div class="panel thanks"><p class="script">Thank you</p><h2 style="margin:6px 0 10px">Your request is in</h2>
    <p>${h(s?.name)} on ${fmtLong(B.done.date)} at ${B.done.time}.</p><p class="muted" style="margin-top:8px">We'll confirm your booking on WhatsApp. Silver Lakes is a secure estate, so we'll register you at the gate once it's confirmed.</p>
    <p style="margin-top:18px"><button class="btn" data-act="bookReset">Book something else</button></p></div>`}
  if(!B.svc){const cats=[...new Set(S.services.map(s=>s.cat))];
    return `<div class="step"><h2><span class="script">Choose</span> your treatment</h2>${cats.map(c=>`<p class="cat">${h(c)}</p>${S.services.filter(s=>s.cat===c).map(s=>`<button class="svc" data-act="pickSvc" data-id="${s.id}"><span><b>${h(s.name)}</b><br><span class="sub">${s.mins} min${prov(s.providerId)?.external?' · with '+h(prov(s.providerId).name):''}</span></span><span class="pr">${R0(s.price)}</span></button>`).join('')}`).join('')}</div>`}
  const s=svc(B.svc),t=today();
  const days=[...Array(21)].map((_,i)=>addDays(t,i));
  if(!B.date) B.date=days.find(d=>slotsFor(d,s).length)||t;
  const sl=slotsFor(B.date,s);
  return `<div class="chosen"><span><b>${h(s.name)}</b><br><span class="sub">${s.mins} min · ${R0(s.price)}</span></span>${btn('Change','bookBack','svc','ghost')}</div>
  <div class="step"><h2><span class="script">Pick</span> a day</h2><div class="days">${days.map(d=>{const open=!!S.settings.hours[D(d).getDay()];
    return `<button class="day ${d===B.date?'on':''}" data-act="pickDate" data-id="${d}" ${open?'':'disabled'}><small>${D(d).toLocaleDateString('en-ZA',{weekday:'short'})}</small><b>${+d.slice(8)}</b><i>${D(d).toLocaleDateString('en-ZA',{month:'short'})}</i></button>`}).join('')}</div></div>
  <div class="step"><h2><span class="script">and</span> a time</h2>${sl.length?`<div class="slots">${sl.map(x=>`<button class="slot ${x===B.time?'on':''}" data-act="pickTime" data-id="${x}">${x}</button>`).join('')}</div>`:'<p class="empty">No open times on this day. Try another day.</p>'}</div>
  ${B.time?`<div class="step"><h2><span class="script">Your</span> details</h2><form data-form="clientBook" class="panel fg">
    <div class="g2"><label class="f">Name and surname<input name="name" required autocomplete="name"></label><label class="f">Cell number (WhatsApp)<input name="phone" required type="tel" autocomplete="tel"></label></div>
    <label class="f">Email (optional)<input name="email" type="email" autocomplete="email"></label>
    <label class="f">Anything we should know? (allergies, pregnancy, first visit)<textarea name="notes"></textarea></label>
    <label class="check"><input type="checkbox" required name="policy"> I understand that cancellations need 24 hours' notice.</label>
    <button class="btn pri" style="justify-self:start">Request ${fmtDate(B.date)} at ${B.time}</button></form></div>`:''}`;
}
function vChat(){
  if(!U.chat.length) U.chat.push({from:'bot',text:`Hi, welcome to ${S.settings.business}! I can help with prices, hours, where to find us and how to prepare for your treatment. What would you like to know?`});
  return `<div class="chat" id="chatlog">${U.chat.map(m=>`<div class="msg ${m.from}">${h(m.text)}${m.action==='book'?`<br><button class="btn sm" style="margin-top:8px" data-act="ctab" data-id="book">Book now</button>`:''}</div>`).join('')}</div>
  <div class="chips">${S.faq.slice(0,5).map(f=>`<button data-act="chip" data-id="${f.id}">${h(f.q)}</button>`).join('')}</div>
  <form data-form="chat" class="chatin"><input name="q" id="chatq" placeholder="Type your question" autocomplete="off" required><button class="btn pri">Send</button></form>
  ${LIVE?'':'<p class="sub" style="text-align:center;margin-top:10px">Preview answers. The final chatbot wording is still being agreed.</p>'}`;
}
function botReply(q){
  const t=q.toLowerCase(),words=t.split(/[^a-z0-9]+/).filter(Boolean);
  const wa=S.settings.whatsapp?`WhatsApp us on ${S.settings.whatsapp}`:'contact the studio';
  if(/\d[\d -]{11,}\d/.test(t)) return{text:"Please don't share card or ID numbers in this chat. We don't take deposits here, and you pay at the studio after your treatment."};
  if(/\b(react|reaction|rash|red|redness|bump|bumpy|burn|burning|swollen|swelling|itch|itchy|infect|infection|blister|pain|sore|medication|roaccutane|accutane|isotretinoin|antibiotic)/.test(t)) return{text:`That needs our therapist to look at it in person, so please ${wa}. If a reaction is severe or getting worse, see a doctor straight away.`};
  if(/\b(botox|filler|fillers|injectable|injection|lip)/.test(t)) return{text:"We don't offer Botox, fillers or other injectables. Our treatments are facials, skin treatments, lashes and brows, and waxing."};
  if(/\b(guarantee|for sure|promise|definitely)\b/.test(t)) return{text:`Every skin is different, so we can't promise results. Our therapist can tell you in person what to expect, so please ${wa} for a consultation.`};
  const isCancel=/\b(cancel|cancellation|reschedule|postpone|kanselleer)/.test(t);
  if(!isCancel&&/\b(book|booking|appointment|afspraak|available|availability|slot)\b/.test(t)) return{text:"You can book right here: pick a treatment and a time that suits you, and we'll confirm on WhatsApp.",action:'book'};
  if(/\b(price|prices|cost|costs|much|hoeveel|kos|prys)\b/.test(t)){
    const hits=S.services.filter(x=>x.name.toLowerCase().split(/[^a-z]+/).some(n=>n.length>3&&words.some(w=>w.startsWith(n)||(w.length>3&&n.startsWith(w)))));
    if(hits.length) return{text:hits.map(x=>`${x.name} (${x.mins} min): ${R0(x.price)}`).join('\n')};
  }
  let best=null,score=0;
  for(const f of S.faq){const kws=f.kw.toLowerCase().split(/[\s,]+/).filter(Boolean);
    const sc=kws.filter(k=>words.some(w=>w===k||(w.length>3&&k.length>3&&(w.startsWith(k)||k.startsWith(w))))).length;
    if(sc>score){score=sc;best=f}}
  if(best) return{text:best.a.replace('{{hours}}',hoursText()).replace('{{prices}}',pricesText())};
  return{text:`I'm not sure about that one yet. ${S.settings.whatsapp?`Send us a WhatsApp on ${S.settings.whatsapp} and we'll help you personally.`:"Add your question to the notes when you book and we'll get back to you."}`};
}

/* ---------- modals ---------- */
function modal(title,inner,form,id=''){
  closeModal();
  const o=document.createElement('div');o.className='ov';o.id='ov';
  o.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="${h(title)}"><div class="mh"><h2>${title}</h2><button class="btn sm ghost" data-act="close" aria-label="Close">✕</button></div>${form?`<form data-form="${form}" data-id="${id}" class="fg">${inner}</form>`:inner}</div>`;
  o.addEventListener('click',e=>{if(e.target===o)closeModal()});
  document.body.appendChild(o);
  const f=o.querySelector('input:not([type=hidden]),select,textarea');if(f&&form)f.focus();
}
function closeModal(){document.getElementById('ov')?.remove()}
const foot=(label,extra='')=>`<div class="mf">${extra}<button type="button" class="btn" data-act="close">Cancel</button><button class="btn pri">${label}</button></div>`;
const svcOptions=sel=>[...new Set(S.services.map(s=>s.cat))].map(c=>`<optgroup label="${h(c)}">${S.services.filter(s=>s.cat===c).map(s=>`<option value="${s.id}" ${s.id===sel?'selected':''}>${h(s.name)} · ${s.mins} min · ${R0(s.price)}</option>`).join('')}</optgroup>`).join('');

function bookingModal(b){
  const isNew=!b||!b.id;b={date:U.view==='diary'?U.diaryDate:today(),time:'10:00',status:'confirmed',serviceId:S.services[0]?.id,clientId:'',notes:'',...(b||{})};
  modal(isNew?'New booking':'Edit booking',`
    <label class="f">Client<select name="clientId" data-change="clientPick"><option value="">New client…</option>${[...S.clients].sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}" ${c.id===b.clientId?'selected':''}>${h(c.name)}</option>`).join('')}</select></label>
    <div class="g2" id="newClientFields" ${b.clientId?'hidden':''}><label class="f">New client name<input name="newName"></label><label class="f">Cell number<input name="newPhone" type="tel"></label></div>
    <label class="f">Treatment<select name="serviceId">${svcOptions(b.serviceId)}</select></label>
    <div class="g2"><label class="f">Date<input type="date" name="date" value="${b.date}" required></label><label class="f">Time<input type="time" name="time" value="${b.time}" step="300" required></label></div>
    <div class="g2"><label class="f">Status<select name="status">${['requested','confirmed','done','noshow','cancelled'].map(s=>`<option value="${s}" ${s===b.status?'selected':''}>${({requested:'Request',confirmed:'Confirmed',done:'Done',noshow:'No-show',cancelled:'Cancelled'})[s]}</option>`).join('')}</select></label>
    <label class="f">Price (R)<input type="number" name="amount" min="0" step="0.01" value="${b.amount??''}" placeholder="From price list"></label></div>
    <label class="f">Notes<textarea name="notes">${h(b.notes)}</textarea></label>
    ${foot(isNew?'Add booking':'Save',isNew?'':`<button type="button" class="btn danger" data-act="bookingDel" data-id="${b.id}" style="margin-right:auto">Delete</button>`)}`,'booking',b.id||'');
}
function payModal(b){
  modal('Done &amp; paid',`<p class="muted">${h(svc(b.serviceId)?.name)} · ${h(client(b.clientId)?.name)}</p>
    <div class="g2"><label class="f">Amount (R)<input type="number" name="amount" min="0" step="0.01" value="${b.amount??svc(b.serviceId)?.price??0}" required></label>
    <label class="f">Paid by<select name="method">${PAY.map(p=>`<option ${p===b.method?'selected':''}>${p}</option>`).join('')}</select></label></div>
    <label class="check"><input type="checkbox" name="unpaid"> Not paid yet</label>${foot('Save')}`,'pay',b.id);
}
function clientModal(c){
  const isNew=!c;c=c||{name:'',phone:'',email:'',notes:''};
  modal(isNew?'Add client':'Edit client',`<label class="f">Name and surname<input name="name" value="${h(c.name)}" required></label>
    <div class="g2"><label class="f">Cell number<input name="phone" type="tel" value="${h(c.phone)}"></label><label class="f">Email<input name="email" type="email" value="${h(c.email)}"></label></div>
    <label class="f">Notes (skin type, allergies, preferences)<textarea name="notes">${h(c.notes)}</textarea></label>${foot(isNew?'Add client':'Save')}`,'client',c.id||'');
}
function clientView(c){
  const bs=S.bookings.filter(b=>b.clientId===c.id).sort(byDT).reverse(),s=clientStats(c);
  modal(h(c.name),`<p class="num">${h(c.phone)}${c.email?' · '+h(c.email):''}</p>
    ${c.notes?`<p class="note" style="margin:12px 0">${h(c.notes)}</p>`:''}
    <p class="sub" style="margin:8px 0">${s.visits} visits · ${R0(s.spent)} spent${s.last?' · last '+fmtDate(s.last):''}</p>
    <div class="list">${bs.map(b=>`<div class="li"><div><b style="font-weight:500">${h(svc(b.serviceId)?.name)}</b><div class="sub">${fmtDate(b.date)} at ${b.time}</div></div>${pill(b.status)}</div>`).join('')||'<p class="empty">No visits yet.</p>'}</div>
    <div class="mf"><button class="btn" data-act="clientEdit" data-id="${c.id}">Edit</button><button class="btn pri" data-act="bookFor" data-id="${c.id}">Book for ${h(c.name.split(' ')[0])}</button></div>`);
}
function expModal(e){
  const isNew=!e;e=e||{date:today(),amount:'',cat:'Consumables',supplier:'',note:''};
  modal(isNew?'Add expense':'Edit expense',`<div class="g2"><label class="f">Date<input type="date" name="date" value="${e.date}" required></label><label class="f">Amount (R, incl. VAT)<input type="number" name="amount" min="0" step="0.01" value="${e.amount}" required></label></div>
    <div class="g2"><label class="f">Paid to<input name="supplier" value="${h(e.supplier)}" required placeholder="e.g. Beauty wholesaler"></label><label class="f">Category<select name="cat">${EXP_CATS.map(c=>`<option ${c===e.cat?'selected':''}>${c}</option>`).join('')}</select></label></div>
    <label class="f">Note<input name="note" value="${h(e.note)}"></label>
    <label class="f">Receipt photo or PDF${e.receipt?' (replace)':''}<input type="file" name="receipt" accept="image/*,application/pdf"></label>
    ${e.receipt?`<img src="${e.receipt}" alt="Current receipt" style="max-height:160px;border-radius:10px;justify-self:start">`:''}
    ${foot(isNew?'Add expense':'Save',isNew?'':`<button type="button" class="btn danger" data-act="expDel" data-id="${e.id}" style="margin-right:auto">Delete</button>`)}`,'expense',e.id||'');
}
function saleModal(){
  modal('Add income',`<p class="sub">For product sales, space rental, gift vouchers and anything that isn't a booked treatment.</p>
    <div class="g2"><label class="f">Date<input type="date" name="date" value="${today()}" required></label><label class="f">Amount (R)<input type="number" name="amount" min="0" step="0.01" required></label></div>
    <div class="g2"><label class="f">What for<input name="desc" required placeholder="e.g. Retail: SPF 50"></label><label class="f">Paid by<select name="method">${PAY.map(p=>`<option>${p}</option>`).join('')}</select></label></div>${foot('Add income')}`,'sale');
}
function budgetModal(){
  modal('Monthly budget',`<div class="fg">${EXP_CATS.map(c=>`<label class="f">${c} (R)<input type="number" min="0" name="b_${c}" value="${S.budget[c]||0}"></label>`).join('')}</div>${foot('Save budget')}`,'budget');
}
function svcModal(s){
  const isNew=!s;s=s||{name:'',cat:'Facials',mins:60,price:'',providerId:S.providers[0].id};
  modal(isNew?'Add service':'Edit service',`<label class="f">Name<input name="name" value="${h(s.name)}" required></label>
    <div class="g2"><label class="f">Category<input name="cat" value="${h(s.cat)}" list="cats" required><datalist id="cats">${[...new Set(S.services.map(x=>x.cat))].map(c=>`<option value="${h(c)}">`).join('')}</datalist></label>
    <label class="f">Done by<select name="providerId">${S.providers.map(p=>`<option value="${p.id}" ${p.id===s.providerId?'selected':''}>${h(p.name)}</option>`).join('')}</select></label></div>
    <div class="g2"><label class="f">Minutes<input type="number" name="mins" min="5" step="5" value="${s.mins}" required></label><label class="f">Price (R)<input type="number" name="price" min="0" step="1" value="${s.price}" required></label></div>
    ${foot(isNew?'Add service':'Save',isNew?'':`<button type="button" class="btn danger" data-act="svcDel" data-id="${s.id}" style="margin-right:auto">Delete</button>`)}`,'service',s.id||'');
}
function stockModal(x){
  const isNew=!x;x=x||{name:'',qty:1,min:1};
  modal(isNew?'Add stock item':'Edit stock item',`<label class="f">Item<input name="name" value="${h(x.name)}" required></label>
    <div class="g2"><label class="f">In stock<input type="number" name="qty" min="0" value="${x.qty}" required></label><label class="f">Reorder when at<input type="number" name="min" min="0" value="${x.min}" required></label></div>
    ${foot(isNew?'Add item':'Save',isNew?'':`<button type="button" class="btn danger" data-act="stockDel" data-id="${x.id}" style="margin-right:auto">Delete</button>`)}`,'stock',x.id||'');
}
function faqModal(f){
  const isNew=!f;f=f||{q:'',kw:'',a:''};
  modal(isNew?'Add chatbot answer':'Edit chatbot answer',`<label class="f">Question as a client would ask it<input name="q" value="${h(f.q)}" required></label>
    <label class="f">Trigger words (separated by spaces)<input name="kw" value="${h(f.kw)}" required></label>
    <label class="f">Answer<textarea name="a" rows="5" required>${h(f.a)}</textarea></label>
    ${foot(isNew?'Add answer':'Save',isNew?'':`<button type="button" class="btn danger" data-act="faqDel" data-id="${f.id}" style="margin-right:auto">Delete</button>`)}`,'faq',f.id||'');
}

/* ---------- image handling ---------- */
function readReceipt(file){
  return new Promise(res=>{
    if(!file||!file.size) return res(null);
    if(!file.type.startsWith('image/')) return res({name:file.name});
    const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const k=Math.min(1,1000/Math.max(img.width,img.height));
      const c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      res({data:c.toDataURL('image/jpeg',.62),name:file.name})};img.onerror=()=>res({name:file.name});img.src=fr.result};
    fr.onerror=()=>res(null);fr.readAsDataURL(file);
  });
}

/* ---------- forms ---------- */
const FORMS={
  async booking(fd,id){
    let clientId=fd.get('clientId');
    if(!clientId){const name=fd.get('newName').trim();if(!name){toast('Choose a client or type a new client name.');return false}
      const c={id:uid(),name,phone:fd.get('newPhone'),email:'',notes:'',created:today()};S.clients.push(c);clientId=c.id;
      if(LIVE) await db.put('clients',c).catch(()=>{})}
    const s=svc(fd.get('serviceId')),amt=fd.get('amount');
    const data={clientId,serviceId:s.id,providerId:s.providerId,mins:s.mins,date:fd.get('date'),time:fd.get('time'),status:fd.get('status'),notes:fd.get('notes'),amount:amt===''?s.price:Number(amt)};
    let b;if(id){b=Object.assign(S.bookings.find(x=>x.id===id),data)}else{b={id:uid(),...data,paid:false,method:'',source:'studio'};S.bookings.push(b)}
    sync('bookings',b);
    if(!id) U.diaryDate=data.date;
    toast(id?'Booking saved':'Booking added');
  },
  pay(fd,id){const b=S.bookings.find(x=>x.id===id);b.status='done';b.amount=Number(fd.get('amount'));b.method=fd.get('method');b.paid=!fd.get('unpaid');sync('bookings',b);toast(b.paid?`Paid ${R0(b.amount)} by ${b.method}`:'Marked done, not paid')},
  client(fd,id){const d={name:fd.get('name').trim(),phone:fd.get('phone'),email:fd.get('email'),notes:fd.get('notes')};
    let c;if(id)c=Object.assign(client(id),d);else{c={id:uid(),...d,created:today()};S.clients.push(c)}sync('clients',c);toast('Client saved')},
  async expense(fd,id,form){
    const file=form.querySelector('[name=receipt]').files[0];
    const r=await readReceipt(file);
    const d={date:fd.get('date'),amount:Number(fd.get('amount')),supplier:fd.get('supplier'),cat:fd.get('cat'),note:fd.get('note')};
    if(r){d.receipt=r.data||null;d.receiptName=r.name}
    let e;if(id)e=Object.assign(S.expenses.find(x=>x.id===id),d);else{e={id:uid(),receipt:null,receiptName:'',...d};S.expenses.push(e)}
    if(LIVE&&r){try{
      const blob=r.data?await (await fetch(r.data)).blob():file;
      e.receiptPath=await db.uploadReceipt(e.id,blob,r.data?'jpg':(file.name.split('.').pop()||'pdf').toLowerCase());
    }catch(err){console.error(err);toast("The receipt didn't upload. Try adding it again.")}}
    sync('expenses',e);
    U.month=d.date.slice(0,7);toast('Expense saved');
  },
  sale(fd){const x={id:uid(),date:fd.get('date'),amount:Number(fd.get('amount')),desc:fd.get('desc'),method:fd.get('method')};S.sales.push(x);sync('sales',x);toast('Income added')},
  budget(fd){EXP_CATS.forEach(c=>S.budget[c]=Number(fd.get('b_'+c)||0));syncStudio();toast('Budget saved')},
  service(fd,id){const d={name:fd.get('name'),cat:fd.get('cat'),providerId:fd.get('providerId'),mins:Number(fd.get('mins')),price:Number(fd.get('price'))};
    let x;if(id)x=Object.assign(svc(id),d);else{x={id:uid(),...d,active:true};S.services.push(x)}sync('services',x);toast('Service saved')},
  stock(fd,id){const d={name:fd.get('name'),qty:Number(fd.get('qty')),min:Number(fd.get('min'))};
    let x;if(id)x=Object.assign(S.stock.find(y=>y.id===id),d);else{x={id:uid(),...d};S.stock.push(x)}sync('stock',x)},
  faq(fd,id){const d={q:fd.get('q'),kw:fd.get('kw'),a:fd.get('a')};let x;if(id)x=Object.assign(S.faq.find(y=>y.id===id),d);else{x={id:uid(),...d,sort:S.faq.length};S.faq.push(x)}sync('faq',x);U.chat=[]},
  task(fd){const x={id:uid(),text:fd.get('text'),due:fd.get('due')||'',done:false};S.tasks.push(x);sync('tasks',x)},
  settings(fd){const st=S.settings;['business','whatsapp','address','email'].forEach(k=>st[k]=fd.get(k));st.vatThreshold=Number(fd.get('vatThreshold'))||1000000;st.slotStep=Number(fd.get('slotStep'));
    st.hours=[0,1,2,3,4,5,6].map(i=>fd.get('open'+i)?[fd.get('from'+i),fd.get('to'+i)]:null);
    S.providers.forEach(p=>{p.name=fd.get('pname_'+p.id);p.role=fd.get('prole_'+p.id);p.external=!!fd.get('pext_'+p.id);sync('providers',p)});syncStudio();toast('Settings saved')},
  async clientBook(fd,_id,form){
    const B=U.book,s=svc(B.svc);
    if(LIVE){
      const btn=form.querySelector('button.pri');btn.disabled=true;btn.textContent='Sending…';
      try{
        const bid=await db.requestBooking({serviceId:s.id,date:B.date,time:B.time,name:fd.get('name').trim(),phone:fd.get('phone'),email:fd.get('email'),notes:fd.get('notes')});
        U.book={svc:null,date:null,time:null,done:{id:bid,serviceId:s.id,date:B.date,time:B.time}};
        if(PUBLIC||!LIVE)S.bookings=await db.loadBusy(today(),addDays(today(),30));else await reloadLive();
      }catch(err){toast(err.message||'Something went wrong. Please try again.');btn.disabled=false;btn.textContent='Try again';return false}
      return;
    }
    if(!slotsFor(B.date,s).includes(B.time)){toast('That time was just taken. Please pick another.');B.time=null;return}
    const phone=fd.get('phone');let c=S.clients.find(x=>normPhone(x.phone)&&normPhone(x.phone)===normPhone(phone));
    if(!c){c={id:uid(),name:fd.get('name').trim(),phone,email:fd.get('email'),notes:'',created:today()};S.clients.push(c)}
    const b={id:uid(),clientId:c.id,serviceId:s.id,providerId:s.providerId,date:B.date,time:B.time,status:'requested',paid:false,method:'',amount:s.price,notes:fd.get('notes'),source:'online'};
    S.bookings.push(b);U.book={svc:null,date:null,time:null,done:b};
  },
  async chat(fd){const q=fd.get('q').trim();if(!q)return;U.chat.push({from:'me',text:q});
    if(LIVE&&db.aiChat){
      U.chat.push({from:'bot',text:'…',pending:true});render();
      const hist=U.chat.filter(m=>!m.pending).slice(-12).map(m=>({role:m.from==='me'?'user':'assistant',content:m.text}));
      while(hist.length&&hist[0].role!=='user')hist.shift();
      let reply;try{reply={text:await db.askBot(hist)}}catch(e){console.error(e);reply=botReply(q)}
      U.chat=U.chat.filter(m=>!m.pending);U.chat.push({from:'bot',...reply});return}
    U.chat.push({from:'bot',...botReply(q)})}
};
document.addEventListener('submit',async e=>{
  const f=e.target.closest('form[data-form]');if(!f)return;e.preventDefault();
  const ok=await FORMS[f.dataset.form](new FormData(f),f.dataset.id||'',f);
  if(ok===false) return;
  if(f.dataset.form==='login') return;
  save();if(f.closest('#ov'))closeModal();render();
  if(f.dataset.form==='chat'){const q=document.getElementById('chatq');q&&q.focus()}
});

/* ---------- actions ---------- */
const findB=id=>S.bookings.find(b=>b.id===id);
const ACT={
  mode:id=>{U.mode=id;window.scrollTo(0,0)},
  nav:id=>{U.view=id;window.scrollTo(0,0)},
  close:()=>{closeModal();return'keep'},
  newBooking:()=>{bookingModal();return'keep'},
  editBooking:id=>{bookingModal(findB(id));return'keep'},
  bookingDel:id=>{S.bookings=S.bookings.filter(b=>b.id!==id);drop('bookings',id);closeModal();toast('Booking deleted')},
  confirm:id=>{const b=findB(id);b.status='confirmed';sync('bookings',b);toast('Confirmed. Send the client a WhatsApp to let them know.')},
  decline:id=>{const b=findB(id);b.status='declined';sync('bookings',b);toast('Request declined')},
  noshow:id=>{const b=findB(id);b.status='noshow';sync('bookings',b)},
  pay:id=>{payModal(findB(id));return'keep'},
  diaryShift:n=>{U.diaryDate=addDays(U.diaryDate,+n)},
  diaryToday:()=>{U.diaryDate=today()},
  diaryDay:d=>{U.diaryDate=d},
  clientOpen:id=>{const c=client(id);if(c)clientView(c);return'keep'},
  clientNew:()=>{clientModal();return'keep'},
  clientEdit:id=>{clientModal(client(id));return'keep'},
  bookFor:id=>{bookingModal({clientId:id});return'keep'},
  monthShift:n=>{U.month=addMonths(U.month,+n)},
  monthNow:()=>{U.month=today().slice(0,7)},
  expNew:()=>{expModal();return'keep'},
  expEdit:id=>{expModal(S.expenses.find(e=>e.id===id));return'keep'},
  expDel:id=>{S.expenses=S.expenses.filter(e=>e.id!==id);drop('expenses',id);closeModal();toast('Expense deleted')},
  receipt:id=>{const e=S.expenses.find(x=>x.id===id);modal('Receipt',`<img src="${e.receipt}" alt="Receipt from ${h(e.supplier)}" style="width:100%;border-radius:12px"><p class="sub" style="margin-top:8px">${h(e.supplier)} · ${fmtDate(e.date)} · ${R(e.amount)}</p>`);return'keep'},
  saleNew:()=>{saleModal();return'keep'},
  budgetEdit:()=>{budgetModal();return'keep'},
  copyCsv:()=>{const ty=taxYear(today()),rows=[['Type','Date','Description','Category','Method','Amount (R)','Receipt']];
    incomeItems(ty.start,ty.end).forEach(i=>rows.push(['Income',i.date,i.desc,i.kind==='booking'?'Treatment':'Other income',i.method,i.amount.toFixed(2),'']));
    expensesIn(ty.start,ty.end).forEach(e=>rows.push(['Expense',e.date,e.supplier+(e.note?' – '+e.note:''),e.cat,'',Number(e.amount).toFixed(2),e.receipt||e.receiptName?'Yes':'No']));
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const done=()=>toast(`Copied ${rows.length-1} rows. Paste into Excel or an email.`);
    navigator.clipboard?.writeText(csv).then(done).catch(()=>{modal('Records for your accountant',`<p class="sub">Select all and copy.</p><textarea style="min-height:260px;font-size:.75rem" readonly>${h(csv)}</textarea>`)})||modal('Records',`<textarea style="min-height:260px" readonly>${h(csv)}</textarea>`);return'keep'},
  studioTab:id=>{U.studio=id},
  studioGo:id=>{U.view='studio';U.studio=id;window.scrollTo(0,0)},
  svcNew:()=>{svcModal();return'keep'},
  svcEdit:id=>{svcModal(svc(id));return'keep'},
  svcDel:id=>{const x=svc(id);S.services=S.services.filter(s=>s.id!==id);if(x){x.active=false;sync('services',x)}closeModal()},
  stockAdj:v=>{const[id,n]=v.split(':'),x=S.stock.find(s=>s.id===id);x.qty=Math.max(0,x.qty+Number(n));sync('stock',x)},
  stockEdit:id=>{stockModal(id?S.stock.find(x=>x.id===id):null);return'keep'},
  stockDel:id=>{S.stock=S.stock.filter(x=>x.id!==id);drop('stock',id);closeModal()},
  taskToggle:id=>{const x=S.tasks.find(t=>t.id===id);x.done=!x.done;sync('tasks',x)},
  taskDel:id=>{S.tasks=S.tasks.filter(t=>t.id!==id);drop('tasks',id)},
  faqEdit:id=>{faqModal(id?S.faq.find(f=>f.id===id):null);return'keep'},
  faqDel:id=>{S.faq=S.faq.filter(f=>f.id!==id);drop('faq',id);U.chat=[];closeModal()},
  copyLink:()=>{const l=bookingLink();navigator.clipboard?.writeText(l).then(()=>toast('Booking link copied')).catch(()=>modal('Your booking link',`<input readonly value="${h(l)}">`));return'keep'},
  logout:async()=>{await db.sb.auth.signOut();location.reload();return'keep'},
  forgot:async()=>{const em=document.getElementById('loginEmail').value.trim();if(!em){toast('Type your email first.');return'keep'}
    const{error}=await db.sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin});toast(error?error.message:'Check your email for a reset link.');return'keep'},
  resetAsk:()=>{modal('Clear example data?',`<p>This removes the example clients, bookings, money records, stock and tasks so you can start with your own. Your services, prices, settings and chatbot answers stay.</p><div class="mf"><button class="btn" data-act="close">Keep examples</button><button class="btn pri" data-act="resetDo">Clear examples</button></div>`);return'keep'},
  resetDo:()=>{Object.assign(S,{clients:[],bookings:[],expenses:[],sales:[],stock:[],tasks:[],example:false});closeModal();toast('Example data cleared')},
  ctab:id=>{U.ctab=id},
  pickSvc:id=>{U.book={svc:id,date:null,time:null,done:null}},
  pickDate:d=>{U.book.date=d;U.book.time=null},
  pickTime:t=>{U.book.time=t},
  bookBack:()=>{U.book={svc:null,date:null,time:null,done:null}},
  bookReset:()=>{U.book={svc:null,date:null,time:null,done:null}},
  chip:id=>{const f=S.faq.find(x=>x.id===id);U.chat.push({from:'me',text:f.q});U.chat.push({from:'bot',...botReply(f.q+' '+f.kw)})}
};
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el)return;
  if(el.tagName==='INPUT'&&el.type==='checkbox'&&el.dataset.act!=='taskToggle')return;
  const fn=ACT[el.dataset.act];if(!fn)return;
  if(el.tagName==='BUTTON'&&!el.closest('form[data-form]')||el.type==='button')e.preventDefault();
  if(fn(el.dataset.id,el)==='keep')return;
  save();render();
  if(el.dataset.act==='pickTime'){document.querySelector('[data-form=clientBook] input')?.focus()}
});
document.addEventListener('change',e=>{
  if(e.target.dataset.change==='clientPick'){document.getElementById('newClientFields').hidden=!!e.target.value}
});
document.addEventListener('input',e=>{
  if(e.target.dataset.input==='search'){U.q=e.target.value;const pos=e.target.selectionStart;render();const s=document.getElementById('clientSearch');s.focus();s.setSelectionRange(pos,pos)}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

/* ---------- render ---------- */
function vLogin(){
  return `<main class="wrap" style="max-width:420px;padding-block:48px"><div style="text-align:center;margin-bottom:28px">${logo('lg')}</div>
  ${U.auth==='checking'?'<p class="empty" style="text-align:center">Loading…</p>':`<form data-form="login" class="panel fg"><h2>Studio sign in</h2>
    ${U.auth==='notstaff'?'<p class="note">This account is not set up as studio staff yet. See the setup guide.</p>':''}
    <label class="f">Email<input id="loginEmail" name="email" type="email" autocomplete="username" required></label>
    <label class="f">Password<input name="password" type="password" autocomplete="current-password" required></label>
    <button class="btn pri" style="justify-self:start">Sign in</button>
    <button type="button" class="btn ghost" data-act="forgot" style="justify-self:start">Forgot password?</button></form>
    <p class="foot">Clients book at <a href="/book" style="color:inherit">${h(location.host)}/book</a></p>`}</main>`;
}
FORMS.login=async(fd)=>{
  const{error}=await db.sb.auth.signInWithPassword({email:fd.get('email'),password:fd.get('password')});
  if(error){toast('That email and password did not match.');return false}
  await startOwner();
};
async function startOwner(){
  try{if(!(await db.isStaff())){U.auth='notstaff';render();return}
    S=await db.loadAll();U.auth='ok';U.loading=false;render();
    db.onBookingChange(async p=>{const was=S.bookings.filter(b=>b.status==='requested').length;await reloadLive();
      if(p.eventType==='INSERT'&&S.bookings.filter(b=>b.status==='requested').length>was)toast('New booking request')});
  }catch(e){console.error(e);toast("Couldn't load your data. Check your connection.")}
}
async function startPublic(){
  try{const pub=await db.loadPublic();Object.assign(S,pub);S.bookings=await db.loadBusy(today(),addDays(today(),30));U.loading=false;render()}
  catch(e){console.error(e);document.getElementById('app').innerHTML='<p class="empty" style="text-align:center;padding:40px">Bookings are not available right now. Please try again later.</p>'}
}
export async function boot(){
  if(!LIVE){render();return}
  if(PUBLIC){render();await startPublic();return}
  const{data}=await db.sb.auth.getSession();
  if(data.session)await startOwner();else{U.auth='login';render()}
}

function render(){
  if(LIVE&&!PUBLIC&&U.auth!=='ok'){document.getElementById('app').innerHTML=vLogin();return}
  if(LIVE&&PUBLIC&&U.loading){document.getElementById('app').innerHTML=`<section class="hero">${logo('lg')}</section><p class="empty" style="text-align:center">Loading…</p>`;return}
  const reqs=S.bookings.filter(b=>b.status==='requested').length;
  const tabs=[['today','Today'],['diary','Diary'],['clients','Clients'],['money','Money'],['tax','Tax'],['studio','Studio']];
  const owner=U.mode==='owner';
  document.getElementById('app').innerHTML=`
  <header class="top"${PUBLIC?' hidden':''}><div class="wrap"><div class="topin">${owner?logo():'<span></span>'}
    <div class="seg" role="group" aria-label="Switch view"><button class="${owner?'on':''}" data-act="mode" data-id="owner">Studio</button><button class="${owner?'':'on'}" data-act="mode" data-id="client">Client view</button></div></div>
    ${owner?`<nav class="tabs">${tabs.map(([k,l])=>`<button class="${U.view===k?'on':''}" data-act="nav" data-id="${k}">${ICONS[k]}<span>${l}</span>${k==='today'&&reqs?`<span class="badge">${reqs}</span>`:''}</button>`).join('')}</nav>`:''}
  </div></header>
  ${S.example&&owner?`<p class="preview wrap">Preview with example data. Changes save on this device only. Clear the examples in Studio › Settings.</p>`:''}
  <main class="wrap ${owner?'owner':''}">${owner?({today:vToday,diary:vDiary,clients:vClients,money:vMoney,tax:vTax,studio:vStudio})[U.view]():vClient()}</main>`;
  const log=document.getElementById('chatlog');if(log)log.scrollTop=log.scrollHeight;
}

// Test hook for the automated end-to-end check (demo mode only).
if(!LIVE&&location.search.includes('e2e')){
  Object.defineProperties(window,{S:{get:()=>S},U:{get:()=>U}});
  Object.assign(window,{today,sum,incomeItems,monthEnd,save,client,live,toMin,svc,prov,addDays,D,slotsFor,saTax,taxYear,botReply});
}
