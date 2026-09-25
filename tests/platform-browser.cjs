/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3217';
const output = path.resolve('artifacts/qa');
const mentor = {id:'qa-mentor', full_name:'QA Mentor',headline:'Software engineer · Career mentoring',avatar_url:'',specialties:['Engineering & Tech'],bio:'A synthetic mentor used only for local interface tests. We can work on your portfolio, interview preparation and career decisions.',standard_price:50000,premium_price:120000,rating:0,reviews_count:0,available_slots:['Saturday, 10:00 – 10:30'],company:'QA Studio',why_work_with_me:'Bring your questions and leave with a practical next step.',price_per_question:10000,soft_cap:3};
(async () => {
 fs.mkdirSync(output,{recursive:true});
 const browser = await chromium.launch({channel:'chrome',headless:true});
 const results=[]; const failures=[];
 try {
 for (const locale of ['en','uz','ru']) for (const width of [320,390,768,1440]) {
  const context=await browser.newContext({viewport:{width,height:900}, reducedMotion:'reduce'});
  await context.addCookies([{name:'NEXT_LOCALE',value:locale,url:base}]);
  await context.route('http://127.0.0.1:54329/**', async route => {
   const url=new URL(route.request().url());
   const table=url.pathname.split('/').at(-1);
   let data=[];
   if(table==='counselors') data=url.searchParams.has('id') ? mentor : [mentor,{...mentor,id:'qa-second',full_name:'QA Designer',standard_price:40000,specialties:['Architecture & Design'],company:'QA Design'}];
   await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
  });
  const page=await context.newPage(); const errors=[];
  page.on('pageerror',e=>errors.push(page.url()+': '+e.message));
  page.on('console',m=>{if(m.type()==='error' && !m.text().includes('Failed to load resource'))errors.push(m.text())});
  for(const route of ['/','/counselors/qa-mentor','/my-bookings','/forum','/survey','/become-counselor','/admin']) {
   const response=await page.goto(base+route); assert.equal(response.status(),200,route);
   await page.locator('h1').first().waitFor();
   await page.evaluate(() => document.fonts.ready);
   if(route==='/' || route.includes('/counselors/')) await page.getByText('QA Mentor',{exact:true}).first().waitFor();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
   if (overflow) failures.push(`${locale} ${width} ${route}: horizontal overflow`);
   const unlabeled=await page.locator('input:not([type=hidden]):not([type=submit]),textarea,select').evaluateAll(nodes=>nodes.filter(el=>!el.labels?.length&&!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')).map(el=>el.outerHTML.slice(0,100)));
   assert.deepEqual(unlabeled,[],`${route}: unlabelled controls`);
   if(locale==='en' && ['/','/counselors/qa-mentor','/forum'].includes(route)) await page.screenshot({path:path.join(output,`${route==='/'?'home':route.startsWith('/counselors')?'profile':'forum'}-${width}.png`),fullPage:true});
   results.push({locale,width,route,overflow:false});
  }
  failures.push(...errors.map(e => `${locale}/${width}: ${e}`));
  await context.close();
 }
 assert.deepEqual(failures,[], 'No responsive layout or runtime errors');
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addCookies([{name:'NEXT_LOCALE',value:'en',url:base}]);
 let fail=true;
 await context.route('http://127.0.0.1:54329/**',r=>r.fulfill({status:fail?503:200,contentType:'application/json',body:JSON.stringify(fail?{message:'offline'}:[mentor])}));
 const page=await context.newPage(); await page.goto(base);
 await page.getByRole('button',{name:/try again|retry/i}).waitFor();
 assert.equal(await page.getByText('QA Mentor',{exact:true}).count(),0);
 fail=false; await page.getByRole('button',{name:/try again|retry/i}).click();
 await page.getByText('QA Mentor',{exact:true}).waitFor();
 const search=page.locator('input[type=search]'); await search.fill('no matching mentor');
 await page.waitForURL(/q=no/); assert.equal(await page.getByText('QA Mentor',{exact:true}).count(),0);
 await page.reload(); assert.equal(await search.inputValue(),'no matching mentor');
 await search.fill('QA'); await page.getByText('QA Mentor',{exact:true}).waitFor();
 const menu=page.getByRole('button',{name:/open menu/i}); await menu.click(); await page.keyboard.press('Escape');
 assert.equal(await menu.getAttribute('aria-expanded'),'false');
 assert.equal(await menu.evaluate(el=>el===document.activeElement),true);
 await context.close();
 fs.writeFileSync(path.join(output,'platform-results.json'),JSON.stringify({checks:results.length,results,searchAndRetry:true,keyboardMenu:true},null,2));
 console.log(`PASS: ${results.length} page/locale/viewport checks; search persistence, live fetch recovery, keyboard menu; screenshots in ${output}`);
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
