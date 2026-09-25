/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3217';
const engine = process.env.QA_BROWSER || 'chromium';
const output = path.resolve('artifacts/qa');
const viewportHeight = 844;
assert.ok(['chromium', 'webkit'].includes(engine), 'QA_BROWSER must be chromium or webkit');

async function ready(page, route = '/') {
  const response = await page.goto(base + route);
  assert.equal(response.status(), 200, route);
  await page.locator('h1').first().waitFor();
  if (route === '/') await page.locator('article.ui-card').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
}

async function noOverflow(page, description) {
  const metrics = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  assert.ok(metrics.content <= metrics.width + 1, `${description}: horizontal overflow ${JSON.stringify(metrics)}`);
}

async function openFilters(page) {
  const details = page.locator('details[name="mentor-filters"]');
  if (!await details.evaluate(element => element.open)) await details.locator('summary').click();
  return details;
}

async function makeContext(browser, locale, width, errors, writes) {
  const context = await browser.newContext({
    viewport: { width, height: viewportHeight },
    locale: { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' }[locale],
    isMobile: width < 1024,
    hasTouch: width < 1024,
    reducedMotion: 'reduce',
  });
  await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: base }]);
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    // This suite exercises the sample catalog and never permits a real write.
    if (!['GET', 'HEAD'].includes(request.method())) {
      writes.push(`${request.method()} ${url.pathname}`);
      return route.abort();
    }
    return url.origin === new URL(base).origin ? route.continue() : route.abort();
  });
  context.on('page', page => {
    page.on('pageerror', error => errors.push(`${locale}/${width}: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error' && !message.text().includes('Failed to load resource')) {
        errors.push(`${locale}/${width}: ${message.text()}`);
      }
    });
  });
  return context;
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await (engine === 'webkit' ? webkit.launch({ headless: true }) : chromium.launch({ channel: 'chrome', headless: true }));
  const errors = [];
  const writes = [];
  const results = [];
  try {
    for (const locale of ['uz', 'ru', 'en']) {
      const copy = require(`../messages/discovery/${locale}.json`);
      for (const width of [320, 390, 768, 1440]) {
        const context = await makeContext(browser, locale, width, errors, writes);
        try {
          const page = await context.newPage();
          await ready(page);
          await page.getByText(copy.results.demoTitle, { exact: true }).waitFor();
          assert.equal(await page.locator('article.ui-card').count(), 6, 'Use the six demo mentors, without a live backend');
          await noOverflow(page, `${locale}/${width}/home`);
          const filters = page.locator('details[name="mentor-filters"]');
          assert.equal(await filters.evaluate(element => element.open), false, 'Filters initially leave room for mentors');
          assert.equal(await page.locator('#company-filter').isVisible(), false);

          const firstCard = page.locator('article.ui-card').first();
          const firstAction = firstCard.locator('a[href^="/counselors/"]');
          const cardBounds = await firstCard.boundingBox();
          const actionBounds = await firstAction.boundingBox();
          const navigation = page.locator('nav.ui-mobile-dock');
          const mobile = width < 1024;
          let usableBottom = viewportHeight;
          if (mobile) {
            assert.equal(await navigation.isVisible(), true);
            const navBounds = await navigation.boundingBox();
            usableBottom = navBounds.y;
            assert.ok(navBounds.y + navBounds.height <= viewportHeight + 1, 'Navigation fits inside viewport');
            const links = navigation.locator('a');
            assert.equal(await links.count(), 3);
            for (const link of await links.all()) {
              const bounds = await link.boundingBox();
              assert.ok(bounds.width >= 44 && bounds.height >= 44, 'Every mobile navigation target is at least 44 × 44');
            }
            assert.equal(await navigation.locator('a[href="/"]').getAttribute('aria-current'), 'page');
            assert.equal(await navigation.locator('a[href="https://t.me/rahnamo_admin"]').getAttribute('target'), '_blank');
          } else {
            assert.equal(await navigation.isVisible(), false, 'Desktop retains header navigation');
          }
          assert.ok(cardBounds.y >= 0 && cardBounds.y < usableBottom, `${locale}/${width}: a mentor is visible without scrolling`);
          assert.ok(actionBounds.y + actionBounds.height <= usableBottom, `${locale}/${width}: first mentor action (${Math.round(actionBounds.y + actionBounds.height)}) must fit above the dock (${Math.round(usableBottom)})`);
          assert.ok(actionBounds.height >= 44, 'The card action has a comfortable touch target');

          if (locale === 'uz' && [390, 1440].includes(width)) {
            await page.screenshot({ path: path.join(output, `mobile-${engine}-home-${width}.png`) });
          }
          if (mobile) {
            // Headless engines do not open an OS keyboard; focus exercises the same dock guard.
            await page.locator('#mentor-search').focus();
            assert.equal(await navigation.isVisible(), false, 'Navigation clears text entry');
            await page.locator('#mentor-search').blur();
            assert.equal(await navigation.isVisible(), true, 'Navigation returns after text entry');
            await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
            const footer = await page.locator('footer').boundingBox();
            const dock = await navigation.boundingBox();
            assert.ok(footer.y + footer.height <= dock.y + 1, 'The final footer links can scroll above fixed navigation');
            await navigation.locator('a[href="/my-bookings"]').click();
            await page.waitForURL(base + '/my-bookings');
            assert.equal(await page.locator('nav.ui-mobile-dock a[href="/my-bookings"]').getAttribute('aria-current'), 'page');
            await noOverflow(page, `${locale}/${width}/my-bookings`);
          }

          await ready(page, '/counselors/c1');
          await page.getByRole('heading', { name: 'Dr. Jasur Mansurov', exact: true }).waitFor();
          await noOverflow(page, `${locale}/${width}/profile`);
          assert.equal(await page.locator('nav.ui-mobile-dock').count(), 0, 'Profile uses one booking dock');
          const bookingDock = page.locator('.ui-mobile-dock');
          assert.equal(await bookingDock.isVisible(), mobile);
          if (mobile) {
            const menuButton = page.getByRole('button', { name: copy.nav.open, exact: true });
            await menuButton.click();
            assert.equal(await bookingDock.isVisible(), false, 'Profile navigation opens without the booking dock over it');
            const menuBounds = await page.locator('#mobile-navigation').boundingBox();
            assert.ok(menuBounds.y + menuBounds.height <= viewportHeight + 1, 'The full mobile menu fits on screen');
            await page.keyboard.press('Escape');
            assert.equal(await menuButton.getAttribute('aria-expanded'), 'false');
            assert.equal(await menuButton.evaluate(element => element === document.activeElement), true);
            assert.equal(await bookingDock.isVisible(), true);
            const bounds = await bookingDock.locator('button').boundingBox();
            assert.ok(bounds.height >= 44 && bounds.y + bounds.height <= viewportHeight, 'Booking action is reachable from the first screen');
            if (locale === 'uz' && width === 390) await page.screenshot({ path: path.join(output, `mobile-${engine}-profile-${width}.png`) });
            await bookingDock.locator('button').click();
            await page.waitForFunction(() => document.activeElement?.id === 'consultation-panel', null, { timeout: 5000 });
            assert.equal(await page.locator('#consultation-panel').evaluate(element => element === document.activeElement), true, 'Booking jump moves keyboard focus');
            const panelBounds = await page.locator('#consultation-panel').boundingBox();
            const headerBounds = await page.locator('header').boundingBox();
            assert.ok(panelBounds.y >= headerBounds.y + headerBounds.height - 1 && panelBounds.y < viewportHeight / 2, 'Booking jump leaves its heading visible below the header');
          }
          results.push({ locale, width, firstCardTop: Math.round(cardBounds.y), firstActionBottom: Math.round(actionBounds.y + actionBounds.height), usableBottom: Math.round(usableBottom), overflow: false });
        } finally {
          await context.close();
        }
      }
    }

    const context = await makeContext(browser, 'en', 390, errors, writes);
    try {
      const page = await context.newPage();
      await ready(page);
      await page.locator('#mentor-search').fill('Jasur');
      await page.waitForURL(url => url.searchParams.get('q') === 'Jasur');
      let filters = await openFilters(page);
      await page.locator('#mentor-category').selectOption('Medicine & Healthcare');
      await page.waitForURL(url => url.searchParams.get('category') === 'Medicine & Healthcare');
      await page.locator('#company-filter').selectOption('Ex-Ankara Hospital');
      await page.waitForURL(url => url.searchParams.get('company') === 'Ex-Ankara Hospital');
      await page.locator('#mentor-sort').selectOption('price-high');
      await page.waitForURL(url => url.searchParams.get('sort') === 'price-high');
      await filters.locator('summary').click();
      filters = await openFilters(page);
      assert.equal(await page.locator('#mentor-category').inputValue(), 'Medicine & Healthcare');
      assert.equal(await page.locator('#company-filter').inputValue(), 'Ex-Ankara Hospital');
      assert.equal(await page.locator('#mentor-sort').inputValue(), 'price-high');
      await filters.locator('summary').click();
      assert.equal(await page.locator('article.ui-card').count(), 1, 'Combined filters keep the selected mentor');
      const filteredUrl = page.url();
      await page.reload();
      await page.locator('article.ui-card').first().waitFor();
      assert.equal(await page.locator('#mentor-search').inputValue(), 'Jasur', 'Search survives reload');
      await page.locator('article.ui-card a[href^="/counselors/"]').click();
      await page.waitForURL(url => url.pathname === '/counselors/c1');
      await page.goBack();
      await page.waitForURL(filteredUrl);
      await openFilters(page);
      assert.equal(await page.locator('#mentor-search').inputValue(), 'Jasur');
      assert.equal(await page.locator('#company-filter').inputValue(), 'Ex-Ankara Hospital', 'Back from a profile preserves filters');
      assert.equal(await page.locator('#mentor-sort').inputValue(), 'price-high');

      await ready(page, '/counselors/c1');
      await page.locator('input[name="slot"]').first().check();
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.locator('#booking-name').fill('Mobile Demo Student');
      assert.equal(await page.locator('.ui-mobile-dock').isVisible(), false, 'No dock obstructs the booking form');
      await page.locator('#booking-email').fill('mobile@example.test');
      await page.locator('#booking-question').fill('I would like help choosing my medical specialty.');
      const optional = page.locator('details:has(#booking-phone)');
      assert.equal(await optional.evaluate(element => element.open), false);
      assert.equal(await page.locator('#booking-phone').isVisible(), false);
      assert.equal(await page.locator('#booking-education').isVisible(), false);
      await optional.locator('summary').click();
      await page.locator('#booking-phone').fill('+998901234567');
      await page.locator('#booking-education').fill('Medical student');
      await optional.locator('summary').click();
      await optional.locator('summary').click();
      assert.equal(await page.locator('#booking-phone').inputValue(), '+998901234567', 'Optional details survive disclosure toggles');
      await optional.locator('summary').click();
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.getByRole('button', { name: 'Save demo booking', exact: true }).waitFor();
      await page.waitForFunction(() => document.activeElement?.id === 'booking-heading', null, { timeout: 5000 });
      assert.equal(await page.locator('#booking-heading').evaluate(element => element === document.activeElement), true, 'Next step moves focus to the booking heading');
      await noOverflow(page, 'review step');
      await page.getByRole('button', { name: 'Back', exact: true }).click();
      assert.equal(await page.locator('#booking-name').inputValue(), 'Mobile Demo Student');
      await page.getByRole('button', { name: 'Back', exact: true }).click();
      await page.locator('.ui-mobile-dock button').waitFor();
      assert.equal(await page.locator('input[name="slot"]').first().isChecked(), true, 'Going back retains the selected slot');
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      assert.equal(await page.locator('#booking-name').inputValue(), 'Mobile Demo Student', 'Returning to details preserves the form');
      assert.equal(await page.locator('#booking-phone').inputValue(), '+998901234567');
      // Save/history is covered by demo-browser.cjs; this suite deliberately ends before submission.
    } finally {
      await context.close();
    }
    assert.deepEqual(writes, [], 'The mobile suite attempted no writes');
    assert.deepEqual(errors, [], 'All responsive views hydrated without errors');
    fs.writeFileSync(path.join(output, `mobile-${engine}-results.json`), JSON.stringify({ engine, checks: results.length, results, filterPersistence: true, bookingJump: true, optionalFields: true, writes }, null, 2));
    console.log(`PASS ${engine}: ${results.length} UZ/RU/EN viewport checks; first mentor action above fold, nav and footer access, filters and browser history, booking focus and optional fields`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
