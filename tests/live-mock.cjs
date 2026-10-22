// Checks the live (Supabase) wiring with the Supabase API mocked.
// Run against a build made with VITE_SUPABASE_URL=http://fake.supabase.test, served on port 4174.
const {chromium}=require('playwright');const fs=require('fs');
const pub=JSON.parse(fs.readFileSync(process.env.PUB_JSON||'/tmp/claude-0/pub.json','utf8'));
const all=JSON.parse(fs.readFileSync(process.env.ALL_JSON||'/tmp/claude-0/all.json','utf8'));
const res=[];const ok=(n,c,i='')=>res.push(`${c?'PASS':'FAIL'}  ${n}${i?'  ('+i+')':''}`);
(async()=>{const b=await chromium.launch();const errs=[],calls=[];
const page=async(path)=>{const p=await b.newPage({viewport:{width:400,height:860}});p.on('pageerror',e=>errs.push(e.message));
 await p.route('http://fake.supabase.test/**',async r=>{const u=new URL(r.request().url()),m=r.request().method(),body=r.request().postData();calls.push(`${m} ${u.pathname}`);
  const J=(x,s=200)=>r.fulfill({status:s,contentType:'application/json',body:JSON.stringify(x)});
  if(u.pathname==='/rest/v1/rpc/public_studio')return J(pub);
  if(u.pathname==='/rest/v1/rpc/busy_times')return J([]);
  if(u.pathname==='/rest/v1/rpc/request_booking'){const a=JSON.parse(body);return a.p_time==='08:00'?J({message:'That time was just taken. Please pick another.',code:'P0001'},400):J('9f0a1b2c-0000-4000-8000-000000000001')}
  if(u.pathname==='/auth/v1/token')return J({access_token:'x.eyJzdWIiOiIxMTEifQ.y',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:'r',user:{id:'11111111-1111-1111-1111-111111111111',email:'owner@x.com',aud:'authenticated',role:'authenticated'}});
  if(u.pathname==='/rest/v1/rpc/is_staff')return J(true);
  if(u.pathname==='/rest/v1/studio'&&m==='GET')return J(all.studio);
  const t=u.pathname.split('/').pop();
  if(m==='GET')return J(all[t]||[]);
  if(m==='POST'||m==='PATCH'||m==='DELETE')return r.fulfill({status:201,body:''});
  return J({});});
 await p.goto('http://localhost:4174'+path);await p.waitForTimeout(800);return p;};
// public booking page
let p=await page('/book');
ok('Public page loads services from Supabase',(await p.$$('.svc')).length===13);
ok('No studio switch on public page',!(await p.isVisible('[data-act=mode]')));
await p.click('.svc >> nth=0');
const pickAndSend=async n=>{await p.click(`.slot >> nth=${n}`);await p.fill('[name=name]','Test');await p.fill('[name=phone]','0821112222');await p.check('[name=policy]');await p.click('[data-form=clientBook] button.pri');await p.waitForTimeout(500)};
await pickAndSend(0);
if(!(await p.isVisible('text=Your request is in'))){ok('Taken slot keeps the form open',await p.isVisible('[data-form=clientBook]'));await pickAndSend(1)}
ok('Booking request sent through request_booking',calls.some(c=>c.includes('request_booking'))&&await p.isVisible('text=Your request is in'));
await p.click('[data-act=ctab][data-id=chat]');await p.fill('#chatq','are you open saturday');await p.press('#chatq','Enter');
ok('Chat answers (keyword mode while AI is off)',(await p.textContent('#chatlog')).includes('Saturday'));
// owner
p=await page('/');
ok('Owner sees sign-in screen',await p.isVisible('text=Studio sign in'));
await p.fill('[name=email]','owner@x.com');await p.fill('[name=password]','pw');await p.click('[data-form=login] button.pri');await p.waitForTimeout(1000);
ok('After sign-in, Today page loads',await p.isVisible('text=New booking'));
ok('Booking requests from database shown',await p.isVisible('text=Booking requests'));
let before=calls.length;await p.click('[data-act=confirm] >> nth=0');await p.waitForTimeout(300);
ok('Confirm writes to bookings table',calls.slice(before).some(c=>c.startsWith('POST /rest/v1/bookings')));
await p.click('[data-act=nav][data-id=studio]');await p.click('[data-act=studioTab][data-id=planner]');await p.fill('[data-form=task] [name=text]','Order wax');await p.click('[data-form=task] button');await p.waitForTimeout(300);
ok('Task saved to tasks table',calls.some(c=>c.startsWith('POST /rest/v1/tasks')));
await p.click('[data-act=studioTab][data-id=settings]');await p.click('[data-form=settings] button.pri');await p.waitForTimeout(300);
ok('Settings saved to studio table',calls.some(c=>c.startsWith('PATCH /rest/v1/studio')));
ok('Sign out shown, example-data button hidden',await p.isVisible('[data-act=logout]')&&!(await p.isVisible('[data-act=resetAsk]')));
await p.click('[data-act=nav][data-id=money]');await p.click('[data-act=expNew]');await p.fill('#ov [name=amount]','99');await p.fill('#ov [name=supplier]','Clicks');
await p.setInputFiles('#ov [name=receipt]','public/icons/icon-192.png');await p.click('#ov button.pri');await p.waitForTimeout(800);
ok('Receipt uploaded to storage and expense saved',calls.some(c=>c.includes('/storage/v1/object/receipts'))&&calls.some(c=>c.startsWith('POST /rest/v1/expenses')));
ok('No page errors',errs.length===0,errs.join(' | '));
console.log(res.join('\n'));await b.close()})().catch(e=>{console.log(res.join('\n'));console.log('CRASH',e.message)});
