/* eslint-disable @typescript-eslint/no-require-imports -- executable CommonJS browser test */
/* Isolated UI integration checks; all data/auth/transaction endpoints are fixtures. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3217';
const uid = '22222222-2222-4222-8222-222222222222';
const closedBookingId = '33333333-3333-4333-8333-333333333333';
const threadId = '44444444-4444-4444-8444-444444444444';
const mentor = { id: 'audit-mentor', full_name: 'Test Mentor', headline: 'A mentor for thoughtful next steps', avatar_url: 'https://example.invalid/mentor.png', specialties: ['Engineering & Tech'], bio: 'Practical guidance on choosing your next step in engineering, careers and education.', standard_price: 45000, premium_price: 130000, rating: 0, reviews_count: 0, available_slots: ['Saturday, 15:00 - 15:30'], company: 'Test Studio', why_work_with_me: 'A clear plan for your next step.', price_per_question: 10000, soft_cap: 1 };
const thread = { id: threadId, booking_id: closedBookingId, counselor_id: mentor.id, student_auth_id: uid, price_per_question: 10000, soft_cap: 1, questions_used: 1, total_owed: 10000, payment_status: 'closed', payment_receipt: 'TEST-REFERENCE' };
const toBase64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
const accessToken = `${toBase64({alg:'HS256',typ:'JWT'})}.${toBase64({sub:uid,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.fixture`;
const session = {access_token:accessToken,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:{id:uid,aud:'authenticated',role:'authenticated',is_anonymous:true,app_metadata:{},user_metadata:{},created_at:new Date().toISOString()}};
const json = (route, data, status=200) => route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'},body:JSON.stringify(data)});
const visible = async (locator) => locator.waitFor({state:'visible',timeout:20000});

(async () => {
  const localeKeys = ['en','uz','ru'].map((l) => JSON.parse(fs.readFileSync(path.join(__dirname,`../messages/journeys/${l}.json`),'utf8')));
  for (const messages of localeKeys.slice(1)) {
    assert.deepEqual(Object.keys(messages).sort(),Object.keys(localeKeys[0]).sort());
    for (const key of Object.keys(messages)) assert.deepEqual([...messages[key].matchAll(/\{(\w+)/g)].map((m)=>m[1]).sort(),[...localeKeys[0][key].matchAll(/\{(\w+)/g)].map((m)=>m[1]).sort(),`ICU fields ${key}`);
  }
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const context = await browser.newContext({viewport:{width:1280,height:900}});
  await context.addCookies([{name:'NEXT_LOCALE',value:'en',url:base}]);
  await context.addInitScript(({session}) => localStorage.setItem('sb-127-auth-token',JSON.stringify(session)),{session});
  const errors = [];
  let booking;
  const submitted = [];
  let slowBookings = false;
  let exactThreadRequested = false;
  let mentorReplyCount = 0;
  let requestedQuestionIds = [];
  let activeThread = {...thread};
  let messageRows = [{id:'m1',thread_id:threadId,sender_role:'student',body:'A saved question from this exact consultation.',created_at:'2026-09-25T09:00:00Z'},{id:'m2',thread_id:threadId,sender_role:'counselor',body:'A saved answer that remains readable after payment.',created_at:'2026-09-25T10:00:00Z'}];
  await context.route('**/*',async (route) => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1','localhost'].includes(url.hostname)) return route.abort();
    if (url.port !== '54329') return route.continue();
    if (route.request().method()==='OPTIONS') return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'}});
    if (url.pathname.includes('/auth/')) return json(route,{...session,user:session.user});
    if (url.pathname==='/rest/v1/counselors') return json(route,mentor);
    if (url.pathname==='/rest/v1/reviews') return json(route,[]);
    if (url.pathname==='/rest/v1/bookings') { if(slowBookings) await new Promise((r)=>setTimeout(r,5500)); return json(route,[booking]); }
    if (url.pathname==='/rest/v1/question_threads') {
      if(url.searchParams.has('booking_id')) { assert.equal(url.searchParams.get('booking_id'),`eq.${closedBookingId}`); exactThreadRequested=true; }
      return json(route,activeThread);
    }
    if (url.pathname==='/rest/v1/thread_messages') return json(route,messageRows);
    if (url.pathname==='/rest/v1/rpc/ask_thread_question') {
      const body=route.request().postDataJSON(); requestedQuestionIds.push(body.p_request_id);
      if(requestedQuestionIds.length===1) return json(route,{message:'Temporary failure'},503);
      activeThread={...activeThread,questions_used:1,total_owed:10000,payment_status:'awaiting_payment'};
      messageRows=[...messageRows,{id:'m3',thread_id:threadId,sender_role:'student',body:body.p_body,created_at:new Date().toISOString()}];
      return json(route,{success:true,questions_used:1,total_owed:10000,awaiting_payment:true});
    }
    throw new Error(`Unmocked Supabase route ${url}`);
  });
  await context.route('**/api/payment-config',route=>json(route,{configured:true,cardNumber:'0000 0000 0000 0000',cardHolder:'TEST ONLY'}));
  await context.route('**/api/bookings',route=>{
    assert.equal(route.request().headers().authorization,`Bearer ${accessToken}`);
    const body=route.request().postDataJSON(); submitted.push(body);
    assert.match(body.id,/^[a-f0-9-]{36}$/i); assert.equal(body.price,undefined); assert.equal(body.meetLink,undefined);
    if(submitted.length===1) return json(route,{success:false,error:'temporary_failure'},500);
    booking={id:body.id,counselor_id:mentor.id,counselor_name:mentor.full_name,counselor_avatar:mentor.avatar_url,tier:body.tier,price:45000,slot:body.slot,student_name:body.studentName,email:body.email,payment_method:body.paymentMethod,payment_receipt:null,payment_status:'pending',status:'confirmed',meet_link:null,created_at:new Date().toISOString()};
    return json(route,{success:true,booking},201);
  });
  await context.route('**/api/bookings/receipt',route=>{const body=route.request().postDataJSON();assert.equal(body.bookingId,booking.id);assert.equal(body.paymentReceipt,'TEST-RECEIPT-001');booking={...booking,payment_receipt:body.paymentReceipt};return json(route,{success:true,booking});});
  await context.route('**/api/threads/mentor-view',route=>{
    const body=route.request().postDataJSON();
    return body.passcode==='correct' ? json(route,{success:true,threads:[activeThread],messages:messageRows}) : json(route,{success:false,error:'invalid_passcode'},401);
  });
  await context.route('**/api/threads/reply',route=>{mentorReplyCount++;const body=route.request().postDataJSON();const message={id:'mentor-final',thread_id:body.threadId,sender_role:'counselor',body:body.body};messageRows.push(message);return json(route,{success:true,message});});
  const page = await context.newPage();
  page.on('pageerror',(e)=>errors.push(e.message));
  await page.goto(`${base}/counselors/${mentor.id}`);
  await visible(page.getByRole('heading',{name:'Test Mentor',exact:true}));
  await page.getByRole('radio',{name:'Saturday, 15:00 - 15:30'}).check();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Full name',{exact:true}).fill('Test Student');
  await page.getByLabel('Email address',{exact:true}).fill('student@example.test');
  await page.getByLabel('What would you like to work on?').fill('How should I choose my next engineering role?');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await visible(page.getByText('Payment details are ready.',{exact:false}));
  assert.equal(await page.getByText('0000 0000 0000 0000',{exact:true}).count(),0,'No transfer account before booking save');
  await page.getByRole('button',{name:'Save booking request',exact:true}).click();
  await visible(page.getByText('We could not confirm that your booking was saved.',{exact:false}));
  await page.getByRole('button',{name:'Save booking request',exact:true}).click();
  await visible(page.getByText('Your booking request is saved',{exact:true}));
  assert.equal(submitted.length,2); assert.equal(submitted[0].id,submitted[1].id,'Retry reuses booking UUID');
  await page.getByLabel('Transfer or receipt reference',{exact:true}).fill('TEST-RECEIPT-001');
  await page.getByRole('button',{name:'Submit transfer reference',exact:true}).click();
  await visible(page.getByText('Reference received.',{exact:false}));
  console.log('PASS booking validation, retry idempotency, post-save transfer and persisted receipt');

  slowBookings=true;
  booking={...booking,payment_status:'confirmed',meet_link:'https://meet.jit.si/fixture-room'};
  await page.goto(`${base}/my-bookings`);
  await visible(page.getByText('This is taking a little longer.',{exact:false}));
  await visible(page.getByRole('link',{name:'Join video session',exact:true}));
  assert.equal(await page.getByRole('link',{name:'Join video session'}).getAttribute('href'),'https://meet.jit.si/fixture-room');
  console.log('PASS authoritative booking response retained after a 5.5-second delay');

  await page.goto(`${base}/counselors/${mentor.id}?mode=text&booking=${closedBookingId}`);
  await visible(page.getByText('A saved answer that remains readable after payment.',{exact:true}));
  assert(exactThreadRequested,'Exact booking ID was applied to thread query');
  assert.equal(await page.getByRole('button',{name:'Send question',exact:true}).count(),0);
  await visible(page.getByText('This balance has been settled.',{exact:false}));
  console.log('PASS exact closed consultation transcript and new-question restriction');

  await page.getByText('Mentor workspace',{exact:true}).click();
  await page.getByLabel('Your mentor access code',{exact:true}).fill('wrong');
  await page.getByRole('button',{name:'Open inbox',exact:true}).click();
  await visible(page.getByText('The access code is incorrect for this mentor.',{exact:true}));
  assert.equal(await page.getByRole('button',{name:'Lock',exact:true}).count(),0,'Invalid passcode remains locked');
  await page.getByLabel('Your mentor access code',{exact:true}).fill('correct');
  await page.getByRole('button',{name:'Open inbox',exact:true}).click();
  await page.getByLabel('Your reply',{exact:true}).fill('Here is the final answer even after payment closure.');
  await page.getByRole('button',{name:'Send reply',exact:true}).click();
  await visible(page.getByText('Here is the final answer even after payment closure.',{exact:true}).first());
  assert.equal(mentorReplyCount,1);
  console.log('PASS failed mentor access stays locked and closed-thread reply remains usable');

  activeThread={...thread,payment_status:'active',questions_used:0,total_owed:0};
  await page.goto(`${base}/counselors/${mentor.id}?mode=text&booking=${closedBookingId}`);
  await page.getByLabel('Your next question',{exact:true}).fill('One final allowed question.');
  await page.getByRole('button',{name:'Send question',exact:true}).click();
  await visible(page.getByText('The question could not be confirmed.',{exact:false}));
  await page.getByRole('button',{name:'Send question',exact:true}).click();
  await visible(page.getByText('New questions are paused for payment.',{exact:false}));
  assert.equal(requestedQuestionIds.length,2); assert.equal(requestedQuestionIds[0],requestedQuestionIds[1]);
  console.log('PASS question retry uses same UUID and successful final question pauses composer');
  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log('PASS all locale keys and ICU placeholders match');
  await browser.close();
})().catch((err)=>{console.error(err);process.exit(1);});
