import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const student = '00000000-0000-4000-8000-000000000001';
const stranger = '00000000-0000-4000-8000-000000000002';
const approvedApplicant = '00000000-0000-4000-8000-000000000003';
const mentorId = 'regression-mentor';
const noTextMentorId = 'regression-video-only';

async function createDatabase(upgrade) {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    INSERT INTO auth.users VALUES ('${student}'), ('${stranger}'), ('${approvedApplicant}');
  `);
  try {
    if (upgrade) {
      const legacy = execFileSync('git', ['show', '0c21b95:supabase/schema.sql'], { cwd: root, encoding: 'utf8' });
      await db.exec(legacy);
      await addLegacyColumnGrants(db);
      const directory = join(root, 'supabase/migrations');
      const migrations = readdirSync(directory).filter((name) => name.endsWith('.sql')).sort();
      assert.ok(migrations.length, 'A deployable upgrade migration is required');
      for (let pass = 0; pass < 2; pass += 1) {
        for (const name of migrations) await db.exec(readFileSync(join(directory, name), 'utf8'));
      }
    } else {
      const schema = readFileSync(join(root, 'supabase/schema.sql'), 'utf8');
      await db.exec(schema);
      await addLegacyColumnGrants(db);
      await db.exec(schema);
    }
    await seed(db);
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

// Table-level REVOKE alone does not remove legacy column-level privileges.
async function addLegacyColumnGrants(db) {
  await db.exec(`
    GRANT SELECT (email, phone, question) ON public.bookings TO anon, authenticated;
    GRANT UPDATE (price, payment_status) ON public.bookings TO anon, authenticated;
    GRANT SELECT (email) ON public.forum_questions TO anon, authenticated;
    GRANT UPDATE (questions_used, total_owed, payment_status) ON public.question_threads TO authenticated;
    GRANT INSERT (thread_id, sender_role, body) ON public.thread_messages TO authenticated;
  `);
}

async function seed(db) {
  await db.exec(`
    INSERT INTO public.counselors (id,full_name,headline,avatar_url,specialties,bio,standard_price,premium_price,rating,reviews_count,available_slots,price_per_question,soft_cap)
      VALUES ('${mentorId}','Regression Mentor','Career guidance','/portrait.png',ARRAY['Engineering & Tech'],'Mentor profile for regression tests',45000,90000,0,0,ARRAY['Monday 10:00'],10000,1),
             ('${noTextMentorId}','Video Mentor','Career guidance','/portrait.png',ARRAY['Engineering & Tech'],'Video only mentor for regression tests',30000,60000,0,0,ARRAY['Monday 11:00'],NULL,NULL);
    INSERT INTO public.counselor_applications (id,full_name,headline,specialties,bio,telegram,email,phone,expected_standard_price,expected_premium_price,expected_price_per_question,expected_soft_cap)
      VALUES ('${approvedApplicant}','Regression Applicant','Career guidance','Engineering & Tech','An experienced counselor applying to mentor students.','@applicant','applicant@example.test','+998901234567',45000,90000,5000,2);
    INSERT INTO public.survey_responses (interested_in_service,contact_info) VALUES ('Yes definitely','private-survey@example.test');
    INSERT INTO public.forum_questions (student_name_or_anonymous,email,category,title,body)
      VALUES ('Anonymous','private-forum@example.test','Engineering & Tech','Career question','A private contact must not be exposed through the public forum.');
  `);
  await insertBooking(db, 'owned-video', student);
  await insertBooking(db, 'other-video', stranger);
}

async function insertBooking(db, id, owner, overrides = {}) {
  const values = { payment_status: 'pending', payment_receipt: null, status: 'confirmed', ...overrides };
  await db.query(`
    INSERT INTO public.bookings (id,student_auth_id,device_id,counselor_id,counselor_name,counselor_headline,counselor_avatar,tier,price,slot,student_name,email,phone,telegram,education,question,payment_status,payment_receipt,status)
    VALUES ($1,$2::uuid,$2::text,$3,'Regression Mentor','Career guidance','/portrait.png','standard',45000,'Monday 10:00','Private Student','student@example.test','+998901234567','@student','University','Private career question',$4,$5,$6)
  `, [id, owner, mentorId, values.payment_status, values.payment_receipt, values.status]);
}

async function asRole(db, role, userId, sql, params = []) {
  assert.ok(['anon', 'authenticated', 'service_role'].includes(role));
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claim.role',$2,false)", [userId || '', role]);
  await db.exec(`SET ROLE ${role}`);
  try { return await db.query(sql, params); }
  finally { await db.exec('RESET ROLE'); }
}

async function hidden(db, role, userId, sql, params = []) {
  try {
    const result = await asRole(db, role, userId, sql, params);
    assert.deepEqual(result.rows, [], `Private rows leaked to ${role}: ${sql}`);
  } catch (error) {
    if (error.code === '42501') return;
    throw error;
  }
}

async function denied(db, role, userId, sql, params = []) {
  await assert.rejects(() => asRole(db, role, userId, sql, params), (error) => error.code === '42501');
}

async function rpc(db, name, placeholders, values, role = 'service_role', userId = '') {
  assert.ok(/^[a-z_]+$/.test(name));
  const result = await asRole(db, role, userId, `SELECT public.${name}(${placeholders}) AS result`, values);
  return result.rows[0].result;
}

async function rejectedOperation(operation) {
  let outcome;
  try { outcome = await operation(); }
  catch (error) {
    assert.ok(['P0001', '23505', '23514', '42501'].includes(error.code), `Unexpected database failure: ${error.code} ${error.message}`);
    return;
  }
  assert.equal(outcome?.success, false, 'Invalid operation must fail explicitly');
}

async function start(db, bookingId = randomUUID(), owner = student, counselorId = mentorId) {
  return rpc(db, 'start_question_thread', '$1::text,$2::text,$3::uuid,$4::text', [bookingId, counselorId, owner, 'en']);
}

async function ask(db, threadId, body, requestId, owner = student) {
  return rpc(db, 'ask_thread_question', '$1::uuid,$2::text,$3::uuid', [threadId, body, requestId], 'authenticated', owner);
}

for (const upgrade of [false, true]) {
  test(upgrade ? 'Legacy installation upgraded twice remains private and functional' : 'Fresh schema reapplied safely removes stale privileges', { timeout: 120000 }, async (t) => {
    const db = await createDatabase(upgrade);
    try {
      await t.test('anonymous private reads and operational writes are denied', async () => {
        for (const table of ['bookings', 'counselor_applications', 'survey_responses', 'question_threads', 'thread_messages']) {
          await hidden(db, 'anon', '', `SELECT * FROM public.${table}`);
        }
        await hidden(db, 'anon', '', 'SELECT email FROM public.forum_questions');
        await denied(db, 'anon', '', "UPDATE public.bookings SET payment_status='confirmed',price=1 WHERE id='owned-video'");
        await denied(db, 'anon', '', 'DELETE FROM public.counselor_applications');
        await denied(db, 'anon', '', "INSERT INTO public.forum_answers(question_id,counselor_id,body) SELECT id,$1,'Impersonated answer' FROM public.forum_questions", [mentorId]);
        const publicCounselors = await asRole(db, 'anon', '', 'SELECT id,full_name FROM public.counselors WHERE id=$1', [mentorId]);
        assert.equal(publicCounselors.rows.length, 1);
        const row = (await db.query("SELECT payment_status,price FROM public.bookings WHERE id='owned-video'")).rows[0];
        assert.deepEqual(row, { payment_status: 'pending', price: 45000 });
      });

      await t.test('student reads only their bookings and cannot use admin RPCs', async () => {
        const mine = await asRole(db, 'authenticated', student, 'SELECT id,email FROM public.bookings ORDER BY id');
        assert.deepEqual(mine.rows.map((row) => row.id), ['owned-video']);
        await hidden(db, 'authenticated', stranger, "SELECT id FROM public.bookings WHERE id='owned-video'");
        await denied(db, 'authenticated', student, "SELECT public.admin_update_booking('owned-video','confirm_payment','https://meet.jit.si/rahnamo-00000000-0000-4000-8000-000000000010')");
        await denied(db, 'authenticated', student, "SELECT public.moderate_application($1,'approve')", [approvedApplicant]);
      });

      let thread;
      let threadBooking;
      await t.test('thread start snapshots counselor pricing, is idempotent, and creates no orphan on failure', async () => {
        threadBooking = randomUUID();
        const created = await start(db, threadBooking);
        assert.ok(created.thread?.id);
        assert.equal(created.booking.id, threadBooking);
        thread = created.thread;
        assert.equal(thread.price_per_question, 10000);
        assert.equal(thread.soft_cap, 1);
        assert.equal(thread.student_auth_id, student);
        await rejectedOperation(() => rpc(db, 'admin_update_thread', '$1::uuid,$2::text', [thread.id, 'confirm_payment']));
        await rejectedOperation(() => rpc(db, 'admin_update_thread', '$1::uuid,$2::text', [thread.id, 'flag']));
        const retried = await start(db, threadBooking);
        assert.equal(retried.thread.id, thread.id);
        await rejectedOperation(() => start(db, threadBooking, stranger));
        const failedId = randomUUID();
        await rejectedOperation(() => start(db, failedId, student, noTextMentorId));
        assert.equal((await db.query('SELECT count(*)::int AS n FROM public.bookings WHERE id=$1', [failedId])).rows[0].n, 0);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM public.question_threads WHERE booking_id=$1', [threadBooking])).rows[0].n, 1);
      });

      await t.test('direct counter changes and messages cannot bypass question billing', async () => {
        await denied(db, 'authenticated', student, 'UPDATE public.question_threads SET questions_used=0,total_owed=0,payment_status=\'active\' WHERE id=$1', [thread.id]);
        await denied(db, 'authenticated', student, "INSERT INTO public.thread_messages(thread_id,sender_role,body) VALUES ($1,'student','An unbilled direct question')", [thread.id]);
        await hidden(db, 'authenticated', stranger, 'SELECT * FROM public.question_threads WHERE id=$1', [thread.id]);
        await denied(db, 'anon', '', 'SELECT public.ask_thread_question($1,$2,$3)', [thread.id, 'Anonymous question', randomUUID()]);
      });

      await t.test('question RPC rejects nonowners and charges exactly once on retry at the cap', async () => {
        await rejectedOperation(() => ask(db, thread.id, 'Someone else’s question', randomUUID(), stranger));
        await db.query('UPDATE public.bookings SET student_auth_id=NULL WHERE id=$1', [thread.booking_id]);
        const legacy = await ask(db, thread.id, 'Unverified legacy ownership', randomUUID());
        assert.equal(legacy.reason, 'ownership_unverified');
        await db.query('UPDATE public.bookings SET student_auth_id=$2 WHERE id=$1', [thread.booking_id, student]);
        const requestId = randomUUID();
        const first = await ask(db, thread.id, 'My first career question', requestId);
        assert.equal(first.success, true);
        const again = await ask(db, thread.id, 'My first career question', requestId);
        assert.equal(again.success, true);
        const stored = (await db.query('SELECT questions_used,total_owed,payment_status,price_per_question FROM public.question_threads WHERE id=$1', [thread.id])).rows[0];
        assert.deepEqual(stored, { questions_used: 1, total_owed: 10000, payment_status: 'awaiting_payment', price_per_question: 10000 });
        assert.equal((await db.query('SELECT count(*)::int AS n FROM public.thread_messages WHERE thread_id=$1 AND sender_role=\'student\'', [thread.id])).rows[0].n, 1);
        await rejectedOperation(() => ask(db, thread.id, 'Another charged question', randomUUID()));
        await rejectedOperation(() => ask(db, thread.id, 'Changed content with same key', requestId));
        await hidden(db, 'authenticated', stranger, 'SELECT * FROM public.thread_messages WHERE thread_id=$1', [thread.id]);
      });

      await t.test('Q&A receipts remain owned; admin payment updates accounting without completing fulfillment', async () => {
        await hidden(db, 'authenticated', stranger, 'UPDATE public.question_threads SET payment_receipt=$2 WHERE id=$1 RETURNING id', [thread.id, 'stolen-reference']);
        const receipt = await asRole(db, 'authenticated', student, 'UPDATE public.question_threads SET payment_receipt=$2 WHERE id=$1 RETURNING id', [thread.id, 'transfer-reference-123']);
        assert.equal(receipt.rows.length, 1);
        const confirmed = await rpc(db, 'admin_update_thread', '$1::uuid,$2::text', [thread.id, 'confirm_payment']);
        assert.equal(confirmed.success, true);
        const paid = (await db.query('SELECT payment_status,total_owed FROM public.question_threads WHERE id=$1', [thread.id])).rows[0];
        assert.equal(paid.payment_status, 'closed');
        assert.equal(paid.total_owed, 10000);
        const history = (await db.query('SELECT price,payment_status,status,payment_receipt FROM public.bookings WHERE id=$1', [threadBooking])).rows[0];
        assert.deepEqual(history, { price: 10000, payment_status: 'confirmed', status: 'confirmed', payment_receipt: 'transfer-reference-123' });
        const repeated = await rpc(db, 'admin_update_thread', '$1::uuid,$2::text', [thread.id, 'confirm_payment']);
        assert.equal(repeated.success, true);
        await asRole(db, 'service_role', '', "INSERT INTO public.thread_messages(thread_id,sender_role,body) VALUES ($1,'counselor','Advice for the accepted final question.')", [thread.id]);
        const transcript = await asRole(db, 'authenticated', student, 'SELECT body FROM public.thread_messages WHERE thread_id=$1', [thread.id]);
        assert.equal(transcript.rows.length, 2);
        await rejectedOperation(() => rpc(db, 'admin_update_thread', '$1::uuid,$2::text', [thread.id, 'flag']));
      });

      await t.test('video admin transitions require payment before completion and preserve meeting links', async () => {
        await rejectedOperation(() => rpc(db, 'admin_update_booking', '$1::text,$2::text,$3::text', ['owned-video', 'complete', 'https://meet.jit.si/rahnamo-00000000-0000-4000-8000-000000000010']));
        await rejectedOperation(() => rpc(db, 'admin_update_booking', '$1::text,$2::text,$3::text', ['owned-video', 'confirm_payment', 'javascript:alert(1)']));
        await db.query("UPDATE public.bookings SET payment_receipt='video-reference' WHERE id='owned-video'");
        const confirmed = await rpc(db, 'admin_update_booking', '$1::text,$2::text,$3::text', ['owned-video', 'confirm_payment', 'https://meet.jit.si/rahnamo-00000000-0000-4000-8000-000000000010']);
        assert.equal(confirmed.booking.payment_status, 'confirmed');
        assert.equal(confirmed.booking.meet_link, 'https://meet.jit.si/rahnamo-00000000-0000-4000-8000-000000000010');
        const retried = await rpc(db, 'admin_update_booking', '$1::text,$2::text,$3::text', ['owned-video', 'confirm_payment', 'https://meet.jit.si/rahnamo-00000000-0000-4000-8000-000000000011']);
        assert.equal(retried.booking.meet_link, 'https://meet.jit.si/rahnamo-00000000-0000-4000-8000-000000000010');
        const complete = await rpc(db, 'admin_update_booking', '$1::text,$2::text,$3::text', ['owned-video', 'complete', null]);
        assert.equal(complete.booking.status, 'completed');
      });

      await t.test('reviews require an owned completed booking and cannot duplicate or misattribute it', async () => {
        await rejectedOperation(() => rpc(db, 'create_booking_review', '$1::text,$2::uuid,$3::integer,$4::text', ['other-video', stranger, 5, 'This session is not complete.']));
        await rejectedOperation(() => rpc(db, 'create_booking_review', '$1::text,$2::uuid,$3::integer,$4::text', ['owned-video', stranger, 5, 'Reviewing someone else’s consultation.']));
        await rejectedOperation(() => rpc(db, 'create_booking_review', '$1::text,$2::uuid,$3::integer,$4::text', ['owned-video', student, 0, 'An invalid rating must fail.']));
        const review = await rpc(db, 'create_booking_review', '$1::text,$2::uuid,$3::integer,$4::text', ['owned-video', student, 4, 'Useful guidance for my next career step.']);
        assert.equal(review.counselor_id, mentorId);
        assert.equal(review.rating, 4);
        const aggregate = (await db.query('SELECT rating,reviews_count FROM public.counselors WHERE id=$1', [mentorId])).rows[0];
        assert.equal(Number(aggregate.rating), 4);
        assert.equal(aggregate.reviews_count, 1);
        await rejectedOperation(() => rpc(db, 'create_booking_review', '$1::text,$2::uuid,$3::integer,$4::text', ['owned-video', student, 1, 'Second review must not be inserted.']));
        assert.equal((await db.query("SELECT count(*)::int AS n FROM public.reviews WHERE booking_id='owned-video'")).rows[0].n, 1);
      });

      await t.test('persistent request limits enforce a window and reset after expiry', async () => {
        assert.equal(await rpc(db, 'consume_api_limit', '$1::text,$2::int,$3::int', ['regression-key', 2, 600]), true);
        assert.equal(await rpc(db, 'consume_api_limit', '$1::text,$2::int,$3::int', ['regression-key', 2, 600]), true);
        assert.equal(await rpc(db, 'consume_api_limit', '$1::text,$2::int,$3::int', ['regression-key', 2, 600]), false);
        await db.query("UPDATE public.api_rate_limits SET window_start=now()-interval '11 minutes' WHERE key=$1", ['regression-key']);
        assert.equal(await rpc(db, 'consume_api_limit', '$1::text,$2::int,$3::int', ['regression-key', 2, 600]), true);
      });

      await t.test('application approval is idempotent and cannot create duplicate counselors', async () => {
        const first = await rpc(db, 'moderate_application', '$1::uuid,$2::text', [approvedApplicant, 'approve']);
        assert.equal(first.success, true);
        const retry = await rpc(db, 'moderate_application', '$1::uuid,$2::text', [approvedApplicant, 'approve']);
        assert.equal(retry.success, true);
        const application = (await db.query('SELECT * FROM public.counselor_applications WHERE id=$1', [approvedApplicant])).rows[0];
        assert.equal(application.status, 'approved');
        const counselors = (await db.query("SELECT * FROM public.counselors WHERE full_name='Regression Applicant'")).rows;
        assert.equal(counselors.length, 1);
        assert.equal(counselors[0].standard_price, 45000);
        assert.equal(counselors[0].price_per_question, 5000);
        await rejectedOperation(() => rpc(db, 'moderate_application', '$1::uuid,$2::text', [approvedApplicant, 'reject']));
      });
    } finally { await db.close(); }
  });
}
