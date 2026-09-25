/* eslint-disable @typescript-eslint/no-require-imports -- This file runs directly in Node as a CommonJS test suite. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const TEST_SECRET = 'local-regression-test-secret-not-for-deployment';
const ISSUED_AT = Date.UTC(2026, 8, 25, 12);
const SESSION_LIFETIME = 12 * 60 * 60 * 1000;

// Exercise the actual TypeScript modules with an isolated clock and environment.
// No production secret, server, or session cookie is read or written.
function loadSessionModule(filename, secret = TEST_SECRET) {
  let now = ISSUED_AT;
  class TestDate extends Date {
    static now() { return now; }
  }
  const source = fs.readFileSync(path.join(root, 'src/lib', filename), 'utf8');
  const compiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const sessionModule = { exports: {} };
  vm.runInNewContext(compiled, {
    module: sessionModule, exports: sessionModule.exports, Buffer, Date: TestDate,
    process: { env: secret ? { SESSION_SECRET: secret } : {} },
    require(specifier) {
      if (specifier === 'crypto' || specifier === 'node:crypto') return crypto;
      if (specifier === 'server-only') return {};
      throw new Error(`Unexpected session dependency: ${specifier}`);
    },
  }, { filename, timeout: 1000 });
  return { ...sessionModule.exports, setNow(value) { now = value; } };
}

for (const purpose of ['admin', 'site']) {
  const title = purpose === 'admin' ? 'Admin' : 'Site';
  const sign = `sign${title}Session`;
  const verify = `verify${title}Session`;

  test(`${title} session is valid before expiry and rejected at/after 12 hours`, () => {
    const session = loadSessionModule(`${purpose}Session.ts`);
    const token = session[sign]();
    assert.equal(session[verify](token), true);
    session.setNow(ISSUED_AT + SESSION_LIFETIME - 1);
    assert.equal(session[verify](token), true);
    session.setNow(ISSUED_AT + SESSION_LIFETIME);
    assert.equal(session[verify](token), false);
    session.setNow(ISSUED_AT + SESSION_LIFETIME + 1);
    assert.equal(session[verify](token), false);
  });

  test(`${title} session rejects modified payload, modified signature, and extra segments`, () => {
    const session = loadSessionModule(`${purpose}Session.ts`);
    const token = session[sign]();
    const [payload, signature] = token.split('.');
    const extendedExpiry = `${purpose}:${ISSUED_AT + SESSION_LIFETIME * 2}`;
    assert.equal(session[verify](`${extendedExpiry}.${signature}`), false);
    const changedSignature = `${signature[0] === 'a' ? 'b' : 'a'}${signature.slice(1)}`;
    assert.equal(session[verify](`${payload}.${changedSignature}`), false);
    assert.equal(session[verify](`${token}.ignored`), false);
    assert.equal(session[verify](`${token}.`), false);
    for (const malformed of [undefined, null, '', '.', 'not-a-session', `${payload}.x`]) {
      assert.equal(session[verify](malformed), false);
    }
  });

  test(`${title} session fails closed without SESSION_SECRET or with a different secret`, () => {
    const good = loadSessionModule(`${purpose}Session.ts`);
    const token = good[sign]();
    const missing = loadSessionModule(`${purpose}Session.ts`, '');
    assert.throws(() => missing[sign](), /SESSION_SECRET/);
    assert.equal(missing[verify](token), false);
    const other = loadSessionModule(`${purpose}Session.ts`, 'another-test-secret');
    assert.equal(other[verify](token), false);
  });
}

test('Site and admin sessions cannot authorize each other, even with the same signing secret', () => {
  const admin = loadSessionModule('adminSession.ts');
  const site = loadSessionModule('siteSession.ts');
  assert.equal(admin.verifyAdminSession(admin.signAdminSession()), true);
  assert.equal(site.verifySiteSession(site.signSiteSession()), true);
  assert.equal(admin.verifyAdminSession(site.signSiteSession()), false);
  assert.equal(site.verifySiteSession(admin.signAdminSession()), false);
});

test('Legacy tokens without a signed purpose cannot authorize either session', () => {
  const payload = String(ISSUED_AT + SESSION_LIFETIME);
  const signature = crypto.createHmac('sha256', TEST_SECRET).update(payload).digest('hex');
  const token = `${payload}.${signature}`;
  assert.equal(loadSessionModule('adminSession.ts').verifyAdminSession(token), false);
  assert.equal(loadSessionModule('siteSession.ts').verifySiteSession(token), false);
});

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(filename) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [filename] : [];
  });
}

function parseFile(filename) {
  const source = fs.readFileSync(filename, 'utf8');
  return { source, ast: ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, filename.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS) };
}

test('Source does not expose Telegram credentials through NEXT_PUBLIC variables', () => {
  const offenders = sourceFiles(path.join(root, 'src')).filter((filename) => /NEXT_PUBLIC_TELEGRAM(?:_[A-Z_]+)?/.test(fs.readFileSync(filename, 'utf8')));
  assert.deepEqual(offenders.map((filename) => path.relative(root, filename)), [], 'Telegram credentials must remain server-only');
});

test('Client entry points do not import Telegram utilities or call the legacy email endpoint', () => {
  const offenders = [];
  for (const filename of sourceFiles(path.join(root, 'src'))) {
    const { ast } = parseFile(filename);
    const isClient = ast.statements.some((statement) => ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression) && statement.expression.text === 'use client');
    if (!isClient) continue;
    const visit = (node) => {
      if (ts.isStringLiteralLike(node)) {
        const value = node.text;
        const parent = node.parent;
        const isImport = ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)
          || (ts.isCallExpression(parent) && (parent.expression.kind === ts.SyntaxKind.ImportKeyword
            || (ts.isIdentifier(parent.expression) && parent.expression.text === 'require')));
        if ((isImport && /(?:^|\/)telegram(?:\.[cm]?[jt]s)?$/.test(value)) || value.includes('/api/send-email')) {
          const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
          offenders.push(`${path.relative(root, filename)}:${line}: ${value}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  assert.deepEqual(offenders, [], 'Client notifications must be performed by the authoritative server operation');
});
