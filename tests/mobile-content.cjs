/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const filename = path.join(__dirname, '../src/lib/counselor-content.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const contentModule = { exports: {} };
vm.runInNewContext(compiled, { module: contentModule, exports: contentModule.exports }, { filename });
const { getCounselorContent, formatSlotLabel, slotDurationMinutes } = contentModule.exports;

test('Sample translations never replace a real mentor, even when IDs overlap', () => {
  const mentor = Object.freeze({ id: 'c1', headline: 'Real mentor title', bio: 'Real mentor biography', whyWorkWithMe: 'A specific service', company: 'Actual studio' });
  const real = getCounselorContent(mentor, 'uz', false);
  assert.equal(real.headline, mentor.headline);
  assert.equal(real.help, mentor.whyWorkWithMe);
  assert.equal(real.company, mentor.company);
  assert.notEqual(getCounselorContent(mentor, 'uz', true).headline, mentor.headline);
});

test('Unknown sample IDs retain their actual content and all supported locales have help text', () => {
  const mentor = Object.freeze({ id: 'new-mentor', headline: 'Title', bio: 'Description' });
  assert.equal(getCounselorContent(mentor, 'ru', true).bio, 'Description');
  for (const id of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']) {
    for (const locale of ['uz', 'ru', 'en']) {
      assert.ok(getCounselorContent({ ...mentor, id }, locale, true).help.length > 15);
    }
  }
});

test('Slot localization changes only known weekday labels and never guesses dates or zones', () => {
  const slot = 'Saturday, 15:00 - 15:30';
  assert.equal(formatSlotLabel(slot, 'uz'), 'Shanba, 15:00 - 15:30');
  assert.equal(formatSlotLabel(slot, 'ru'), 'Суббота, 15:00 - 15:30');
  assert.equal(formatSlotLabel(slot, 'en'), slot);
  for (const value of ['2026-10-03T15:00:00+05:00', 'By agreement', 'Saturdayish']) {
    assert.equal(formatSlotLabel(value, 'uz'), value);
  }
});

test('Duration uses valid explicit time ranges and fails closed for ambiguous or invalid times', () => {
  assert.equal(slotDurationMinutes('Saturday, 15:00 - 15:30'), 30);
  assert.equal(slotDurationMinutes('Sunday, 10:00 – 10:45'), 45);
  for (const value of ['Saturday', '25:00 - 25:30', '15:75 - 16:00', '15:00 - 15:00', '23:45 - 00:15', '115:00 - 15:30']) {
    assert.equal(slotDurationMinutes(value), null, value);
  }
});
