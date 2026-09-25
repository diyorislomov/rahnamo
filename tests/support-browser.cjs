/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS browser-test entry point. */
/* Offline browser regression checks. All data/provider traffic is intercepted. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3217';
const origin = new URL(base).origin;
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('QA_BASE_URL must be local.');
const ids = { application:'10000000-0000-4000-8000-000000000001', question:'20000000-0000-4000-8000-000000000001', answer:'30000000-0000-4000-8000-000000000001' };
const now = '2026-09-25T10:00:00Z';
const mentor = {id:'mentor-qa',full_name:'Synthetic QA Mentor',headline:'Career guidance',specialties:['Engineering & Tech'],standard_price:45000,premium_price:130000,created_at:now};
const booking = {id:'RNM-QA-OFFLINE',student_name:'Synthetic QA Student',counselor_name:mentor.full_name,email:'qa@example.invalid',phone:'+998901234567',telegram:'@qa_student',slot:'2026-10-01 10:00',tier:'standard',price:45000,payment_method:'bank_transfer',payment_status:'pending',payment_receipt:'OFFLINE-QA-REFERENCE',status:'confirmed',question:'A synthetic test question',created_at:now};
const application = {id:ids.application,full_name:'Synthetic QA Applicant',headline:'Experienced software mentor',specialties:'Engineering & Tech',bio:'A synthetic application with sufficient detail for testing.',email:'applicant@example.invalid',phone:'+998901234567',telegram:'@qa_applicant',status:'pending',expected_standard_price:45000,expected_premium_price:130000,created_at:now};
const initialQuestion = {id:ids.question,student_name_or_anonymous:'Synthetic community member',category:'Engineering & Tech',title:'How should I start a technology career?',body:'I am deciding how to start learning programming and would appreciate guidance.',created_at:now};
const data = {bookings:[booking],applications:[application],forumQuestions:[initialQuestion],forumAnswers:[],surveyResponses:[],counselors:[mentor],threads:[]};
const calls = {applications:0,survey:0,questions:0,answers:0,confirm:0,approve:0};
const failures = [];
const results = [];
const cors = {'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
let adminDataFailure = false;
let adminTruncated = false;
let browser;

async function json(route, body, status = 200) { await route.fulfill({status,contentType:'application/json',headers:cors,body:JSON.stringify(body)}); }
async function run(name, callback) {
  try { await callback(); results.push({name,passed:true}); console.log('PASS',name); }
  catch(error) { results.push({name,passed:false,error:error.message}); throw error; }
}

(async () => {
  browser = await chromium.launch({channel:'chrome',headless:true});
  const context = await browser.newContext({viewport:{width:1280,height:960},reducedMotion:'reduce',serviceWorkers:'block'});
  await context.addCookies([{name:'NEXT_LOCALE',value:'en',url:base}]);
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'OPTIONS') return route.fulfill({status:204,headers:cors});
    if (url.pathname.startsWith('/rest/v1/')) {
      if (request.method() !== 'GET') throw new Error('Unexpected direct database write: '+url.pathname);
      if (url.pathname === '/rest/v1/public_forum_questions') return json(route,data.forumQuestions);
      if (url.pathname === '/rest/v1/forum_answers') return json(route,data.forumAnswers);
      if (url.pathname === '/rest/v1/counselors') return json(route,data.counselors);
      throw new Error('Unexpected database read: '+url.pathname);
    }
    if (url.origin !== origin) { failures.push('Blocked external request: '+url.origin); return route.abort('blockedbyclient'); }
    if (url.pathname === '/api/applications') {
      calls.applications++;
      const payload = request.postDataJSON();
      assert.equal(payload.expected_price_per_question,10000);
      assert.equal(payload.expected_soft_cap,5);
      return calls.applications === 1 ? json(route,{success:false,error:'service_unavailable'},503) : json(route,{success:true,application:{id:ids.application,status:'pending'}},201);
    }
    if (url.pathname === '/api/survey') {
      calls.survey++;
      const payload = request.postDataJSON();
      assert.equal(payload.interested_in_service,'Maybe');
      assert.equal(payload.contact_info,'@qa_contact');
      return calls.survey === 1 ? json(route,{success:false,error:'service_unavailable'},503) : json(route,{success:true},201);
    }
    if (url.pathname === '/api/forum/question') {
      calls.questions++;
      const payload = request.postDataJSON();
      if (calls.questions === 1) return json(route,{success:false,error:'service_unavailable'},503);
      const question = {...payload,id:'20000000-0000-4000-8000-000000000002',created_at:now};
      delete question.email;
      data.forumQuestions.push(question);
      return json(route,{success:true,question},201);
    }
    if (url.pathname === '/api/forum/answer') {
      calls.answers++;
      const payload = request.postDataJSON();
      assert.equal(payload.counselorId,mentor.id);
      if (payload.passcode !== 'individual-qa-code') return json(route,{success:false,error:'invalid_passcode'},401);
      const answer = {id:ids.answer,question_id:payload.questionId,counselor_id:payload.counselorId,body:payload.body,created_at:now};
      data.forumAnswers.push(answer);
      return json(route,{success:true,persisted:true,answer},201);
    }
    if (url.pathname === '/api/admin/check') return json(route,{authenticated:true});
    if (url.pathname === '/api/admin/data') return adminDataFailure ? json(route,{success:false,error:'service_unavailable'},503) : json(route,{success:true,...data,truncated:adminTruncated});
    if (url.pathname === '/api/admin/bookings') {
      const payload = request.postDataJSON(); assert.equal(payload.action,'confirm_payment'); assert.equal(payload.bookingId,booking.id);
      calls.confirm++;
      if (calls.confirm === 1) return json(route,{success:false,error:'service_unavailable'},503);
      booking.payment_status = 'confirmed';
      return json(route,{success:true,booking});
    }
    if (url.pathname === '/api/admin/applications') {
      const payload = request.postDataJSON(); assert.equal(payload.action,'approve'); assert.equal(payload.applicationId,application.id);
      calls.approve++;
      if (calls.approve === 1) return json(route,{success:false,error:'service_unavailable'},503);
      application.status = 'approved';
      return json(route,{success:true,counselorId:mentor.id});
    }
    if (url.pathname === '/api/admin/logout') return json(route,{success:true});
    if (url.pathname.startsWith('/api/') && url.pathname !== '/api/build-version') throw new Error('Unexpected real API request: '+url.pathname);
    return route.continue();
  });
  const page = await context.newPage();
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));

  await run('Application validates prices; failed submission retains input and retry saves', async () => {
    await page.goto(base+'/become-counselor');
    await page.locator('#full_name').fill('Synthetic QA Applicant');
    await page.locator('#headline').fill('Experienced software mentor');
    await page.locator('#specialties').fill('Software engineering');
    await page.locator('#bio').fill('Ten years of experience helping learners understand software careers.');
    await page.locator('#email').fill('applicant@example.invalid');
    await page.locator('#phone').fill('+998901234567');
    await page.locator('#telegram').fill('@qa_applicant');
    await page.locator('#expected_standard_price').fill('0');
    await page.locator('form button[type="submit"]').click();
    assert.equal(calls.applications,0);
    assert.equal(await page.locator('#expected_standard_price').evaluate(el=>el.validity.rangeUnderflow),true);
    await page.locator('#expected_standard_price').fill('45000');
    await page.locator('#expected_soft_cap').fill('5');
    await page.locator('form button[type="submit"]').click();
    await page.getByText('Choose a question limit from 1 to 100, and provide a price per question.').waitFor();
    assert.equal(calls.applications,0);
    await page.locator('#expected_price_per_question').fill('10000');
    await page.locator('form button[type="submit"]').click();
    await page.getByText('We could not complete this request. Your changes have not been saved. Please try again.').waitFor();
    assert.equal(await page.locator('#full_name').inputValue(),'Synthetic QA Applicant');
    assert.equal(await page.getByRole('heading',{name:'Application received',exact:true}).count(),0);
    await page.locator('form button[type="submit"]').click();
    await page.getByRole('heading',{name:'Application received',exact:true}).waitFor();
    assert.equal(calls.applications,2);
  });

  await run('Survey switches UZ/RU/EN; failure retains data and retry succeeds', async () => {
    await page.goto(base+'/survey');
    await page.getByRole('button',{name:'Русский',exact:true}).click();
    await page.waitForFunction(()=>document.documentElement.lang==='ru');
    await page.getByRole('heading',{name:'Помогите сделать карьерные консультации полезнее.'}).waitFor();
    await page.getByRole('button',{name:'O‘zbekcha',exact:true}).click();
    await page.waitForFunction(()=>document.documentElement.lang==='uz');
    await page.getByRole('heading',{name:'Yaxshiroq kasbiy yoʻl-yoʻriq yaratishga yordam bering.'}).waitFor();
    await page.getByRole('button',{name:'English',exact:true}).click();
    await page.waitForFunction(()=>document.documentElement.lang==='en');
    await page.locator('#interested_in_service').selectOption('Maybe');
    await page.locator('#biggest_challenge').fill('Synthetic QA career challenge');
    await page.locator('#contact_info').fill('@qa_contact');
    await page.locator('form button[type="submit"]').click();
    await page.getByText('We could not complete this request. Your changes have not been saved. Please try again.').waitFor();
    assert.equal(await page.locator('#biggest_challenge').inputValue(),'Synthetic QA career challenge');
    assert.equal(await page.locator('#contact_info').inputValue(),'@qa_contact');
    await page.locator('form button[type="submit"]').click();
    await page.getByRole('heading',{name:'Thank you for sharing.'}).waitFor();
    assert.equal(calls.survey,2);
  });

  await run('Forum uses live mentor roster; wrong individual code preserves answer', async () => {
    await page.goto(base+'/forum');
    await page.getByRole('heading',{name:initialQuestion.title,exact:true}).waitFor();
    await page.getByRole('button',{name:'Answer as a Rahnamo',exact:true}).click();
    const answerForm = page.locator('article form');
    await answerForm.locator('select').selectOption(mentor.id);
    assert.equal(await answerForm.locator('option:checked').textContent(),mentor.full_name);
    await answerForm.locator('textarea').fill('A synthetic mentor answer that must persist only after authorization.');
    await answerForm.locator('input[type=password]').fill('wrong-individual-code');
    await answerForm.locator('button[type=submit]').click();
    await page.getByText('Incorrect Rahnamo code. Check the code from your Rahnamo partnership agreement.').waitFor();
    assert.match(await answerForm.locator('textarea').inputValue(),/synthetic mentor answer/);
    assert.equal(data.forumAnswers.length,0);
    await answerForm.locator('input[type=password]').fill('individual-qa-code');
    await answerForm.locator('button[type=submit]').click();
    await page.getByText('Your answer is published.').waitFor();
    assert.equal(data.forumAnswers.length,1);
    await page.getByText('A synthetic mentor answer that must persist only after authorization.').waitFor();
  });

  await run('Forum question failure preserves draft; success comes from saved row', async () => {
    await page.locator('#forum-title').fill('Synthetic offline question for career advice');
    await page.locator('#forum-body').fill('Synthetic body with enough detail to validate failure and retry behavior.');
    await page.locator('#forum-name').fill('Synthetic QA Student');
    await page.locator('#forum-email').fill('student@example.invalid');
    await page.getByRole('button',{name:'Post question',exact:true}).click();
    await page.getByText('We could not complete this request. Your changes have not been saved. Please try again.').waitFor();
    assert.equal(await page.locator('#forum-title').inputValue(),'Synthetic offline question for career advice');
    assert.equal(await page.getByRole('heading',{name:'Synthetic offline question for career advice'}).count(),0);
    await page.getByRole('button',{name:'Post question',exact:true}).click();
    await page.getByRole('heading',{name:'Synthetic offline question for career advice'}).waitFor();
    assert.equal(await page.locator('#forum-title').inputValue(),'');
    assert.equal(calls.questions,2);
  });

  await run('Admin payment stays pending on failed write, changes only after success', async () => {
    await page.goto(base+'/admin');
    await page.getByText('OFFLINE-QA-REFERENCE',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Confirm payment',exact:true}).click();
    await page.getByText('We could not complete this request. Your changes have not been saved. Please try again.').waitFor();
    assert.equal(booking.payment_status,'pending');
    assert.equal(await page.getByRole('button',{name:'Mark completed',exact:true}).count(),0);
    await page.getByRole('button',{name:'Confirm payment',exact:true}).click();
    await page.getByRole('button',{name:'Mark completed',exact:true}).waitFor();
    assert.equal(booking.payment_status,'confirmed');
    assert.equal(calls.confirm,2);
    assert.equal(await page.getByRole('button',{name:'Confirm payment',exact:true}).count(),0);
  });

  await run('Admin approval is acknowledged before profile status changes', async () => {
    await page.getByRole('button',{name:/^Applications\s*1$/}).click();
    await page.getByRole('button',{name:'Approve mentor',exact:true}).click();
    await page.getByText('We could not complete this request. Your changes have not been saved. Please try again.').waitFor();
    assert.equal(application.status,'pending');
    await page.getByRole('button',{name:'Approve mentor',exact:true}).click();
    await page.locator('article').getByText('Approved',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Approve mentor',exact:true}).count(),0);
    assert.equal(calls.approve,2);
    adminDataFailure = true;
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await page.getByText('Private records could not be loaded. Existing information may be out of date.').waitFor();
    await page.getByRole('heading',{name:'Synthetic QA Applicant',exact:true}).waitFor();
    assert.equal(await page.getByText('No records in this section yet.').count(),0);
    adminDataFailure = false;
    adminTruncated = true;
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await page.getByText('This overview shows up to 1,000 records per section. Counts and search cover only the records loaded here.').waitFor();
  });

  await run('Retired site gate ignores unsafe next URLs', async () => {
    await page.goto(base+'/site-gate?next=javascript:alert(1)');
    await page.waitForURL(origin+'/');
  });
  await run('Uzbek calculator hydrates with deterministic number formatting', async () => {
    await context.addCookies([{name:'NEXT_LOCALE',value:'uz',url:base}]);
    await page.goto(base+'/become-counselor');
    await page.locator('#example-price').waitFor();
    assert.ok((await page.locator('aside').innerText()).includes('850\u00a0000'));
  });
  assert.deepEqual(pageErrors,[],'No client-side exceptions');
  // Unknown external requests are always blocked. Local fixture Supabase traffic is intercepted above.
  console.log(JSON.stringify({passed:results.length,results,calls,blockedExternalRequests:failures,clientErrors:pageErrors},null,2));
  await context.close();
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
