/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3217';
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 try {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addCookies([{name:'NEXT_LOCALE',value:'en',url:base}]);
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
  const page=await context.newPage();const errors=[];const writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.method()==='POST' && r.url().includes('/api/'))writes.push(r.url());});
  await page.goto(base);
  await page.getByText('You are viewing a demo catalog',{exact:true}).waitFor();
  assert.equal(await page.getByText('Example profile',{exact:true}).count(),6);
  await page.goto(base+'/counselors/c1');
  await page.getByRole('heading',{name:'Dr. Jasur Mansurov',exact:true}).waitFor();
  await page.locator('input[name="slot"]').first().check();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Full name',{exact:true}).fill('Demo Student');
  await page.getByLabel('Email address',{exact:true}).fill('demo@example.test');
  await page.getByLabel('What would you like to work on?',{exact:true}).fill('I want to explore a medical career.');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Save demo booking',exact:true}).click();
  await page.getByRole('heading',{name:'Your demo booking is ready',exact:true}).waitFor();
  await page.goto(base+'/my-bookings');
  await page.getByText('Demo history is stored only in this browser. These entries are not real appointments.',{exact:true}).waitFor();
  await page.getByText('Dr. Jasur Mansurov',{exact:true}).waitFor();
  for(const route of ['/become-counselor','/forum','/survey']) {
   await page.goto(base+route);await page.locator('fieldset').first().waitFor();
   assert.equal(await page.locator('fieldset input, fieldset select, fieldset textarea').first().isDisabled(),true,route+' submissions must be disabled in demo');
  }
  for(const locale of ['uz','ru','en']) {
   await context.addCookies([{name:'NEXT_LOCALE',value:locale,url:base}]);
   for(const route of ['/','/counselors/c1']) {
    await page.goto(base+route);await page.locator('h1').first().waitFor();await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,locale+route);
   }
  }
  assert.deepEqual(writes,[],'Demo never sends writes');assert.deepEqual(errors,[],'Demo locales hydrate cleanly');
  fs.mkdirSync('artifacts/qa',{recursive:true});
  await page.goto(base);await page.screenshot({path:path.resolve('artifacts/qa/demo-home-mobile.png'),fullPage:true});
  console.log('PASS demo booking/history, disabled real submissions, zero writes, UZ/RU/EN hydration, mobile layout');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
