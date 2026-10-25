import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import pg from "pg";
import images from "../tests/fixtures/upload-images.json" with { type: "json" };
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3102";
const dbUrl = new URL(process.env.DATABASE_URL);
assert(
  /_(ci|test)$/.test(dbUrl.pathname),
  "A disposable test database is required",
);
assert(
  ["127.0.0.1", "localhost"].includes(new URL(base).hostname),
  "A loopback app is required",
);
const db = new pg.Client({ connectionString: dbUrl.toString() });
await db.connect();
let checks = 0;
const userIds = [],
  mentorIds = [];
async function req(path, { method = "GET", body, cookie, origin } = {}) {
  const response = await fetch(base + "/api/" + path, {
    method,
    headers: {
      Origin: origin || process.env.NEXT_PUBLIC_SITE_URL || base,
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    data: await response.json().catch(() => null),
    headers: response.headers,
  };
}
const expect = (result, status) => {
  assert.equal(result.status, status, JSON.stringify(result.data));
  checks++;
  return result.data;
};
const read = (path, cookie) => req("network/" + path, { cookie });
const write = (path, body, cookie, method = "POST") =>
  req("network/" + path, { method, body, cookie });
async function user(name) {
  const id = randomUUID(),
    token = randomUUID();
  userIds.push(id);
  await db.query("INSERT INTO users(id,name,email) VALUES($1,$2,$3)", [
    id,
    name,
    id + "@example.test",
  ]);
  await db.query(
    'INSERT INTO sessions("userId","sessionToken",expires) VALUES($1,$2,now()+interval \'1 hour\')',
    [id, token],
  );
  return {
    id,
    cookie: `authjs.session-token=${token}; __Secure-authjs.session-token=${token}`,
  };
}
async function mentor() {
  const id = "network-" + randomUUID(),
    account = randomUUID(),
    token = randomBytes(32).toString("hex");
  mentorIds.push(id);
  await db.query(
    "INSERT INTO counselors(id,full_name,headline,avatar_url,bio) VALUES($1,'Network Test Mentor','Career mentor','','Mentor biography')",
    [id],
  );
  await db.query(
    "INSERT INTO mentor_accounts(id,counselor_id,email) VALUES($1,$2,$3)",
    [account, id, id + "@example.test"],
  );
  await db.query(
    "INSERT INTO mentor_sessions(token_hash,account_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",
    [createHash("sha256").update(token).digest("hex"), account],
  );
  return { id, cookie: "rahnamo_mentor_session=" + token };
}
const input = (name, extra = {}) => ({
  name,
  headline: "Product designer",
  bio: "I build useful products.",
  location: "Toshkent",
  skills: ["Design", "Research"],
  experience: "Independent projects",
  education: "University",
  website: "https://example.test",
  image: "",
  published: true,
  ...extra,
});
try {
  const a = await user("Network Learner A"),
    b = await user("Network Learner B"),
    m = await mentor();
  expect(await write("posts", { body: "Anonymous" }, undefined), 401);
  const pa = expect(await read("me", a.cookie), 200).profile,
    pb = expect(await read("me", b.cookie), 200).profile,
    pm = expect(await read("me", m.cookie), 200).profile;
  assert.equal(pa.published, false);
  assert.equal(pm.counselor_id, m.id);
  expect(await read("profiles/" + pa.id), 404);
  expect(await write("posts", { body: "Not public yet" }, a.cookie), 409);
  expect(
    await write(
      "profile",
      input("Network Learner A", { user_id: b.id, counselor_id: m.id }),
      a.cookie,
    ),
    200,
  );
  expect(await write("profile", input("Network Learner B"), b.cookie), 200);
  const publicProfile = expect(await read("profiles/" + pa.id), 200).profile;
  for (const field of ["email", "phone", "user_id", "password_hash"])
    assert(!(field in publicProfile));
  assert.equal(publicProfile.counselor_id, null);
  assert(
    expect(await read("people?q=research"), 200).people.some(
      (p) => p.id === pa.id,
    ),
  );
  assert(
    expect(await read("people?mentors=true"), 200).people.every(
      (p) => p.counselor_id,
    ),
  );
  expect(
    await write(
      "profile",
      input("Bad", { website: "javascript:alert(1)" }),
      a.cookie,
    ),
    400,
  );
  expect(
    await req("network/posts", {
      method: "POST",
      body: { body: "Bad origin" },
      cookie: a.cookie,
      origin: "https://evil.example",
    }),
    403,
  );
  expect(await write("follow/" + pa.id, { following: true }, a.cookie), 400);
  expect(await write("follow/" + pm.id, { following: true }, a.cookie), 200);
  expect(await write("follow/" + pm.id, { following: true }, a.cookie), 200);
  assert.equal(
    expect(await read("profiles/" + pm.id, a.cookie), 200).profile.followers,
    1,
  );
  const aPost = expect(
    await write("posts", { body: "Original post", image: "" }, a.cookie),
    201,
  ).id;
  const mPost = expect(
    await write("posts", { body: "Mentor insight", image: "" }, m.cookie),
    201,
  ).id;
  const bPost = expect(
    await write("posts", { body: "Learner B post", image: "" }, b.cookie),
    201,
  ).id;
  const following = expect(
    await read("feed?mode=following", a.cookie),
    200,
  ).posts;
  assert(following.some((p) => p.id === aPost));
  assert(following.some((p) => p.id === mPost));
  assert(!following.some((p) => p.id === bPost));
  expect(
    await write("posts/" + aPost, { body: "Impersonation" }, b.cookie, "PATCH"),
    404,
  );
  expect(await write("posts/" + aPost, {}, b.cookie, "DELETE"), 404);
  expect(
    await write(
      "posts/" + aPost,
      { body: "Updated insight" },
      a.cookie,
      "PATCH",
    ),
    200,
  );
  expect(
    await write("posts/" + aPost + "/like", { active: true }, b.cookie),
    200,
  );
  expect(
    await write("posts/" + aPost + "/like", { active: true }, b.cookie),
    200,
  );
  const liked = expect(await read("feed?post=" + aPost, b.cookie), 200)
    .posts[0];
  assert.equal(liked.likes, 1);
  assert.equal(liked.liked, true);
  assert.equal(liked.body, "Updated insight");
  expect(
    await write("posts/" + aPost + "/save", { active: true }, b.cookie),
    200,
  );
  assert.equal(
    expect(await read("feed?mode=saved", a.cookie), 200).posts.length,
    0,
  );
  assert.equal(
    expect(await read("feed?mode=saved", b.cookie), 200).posts[0].id,
    aPost,
  );
  const comment = expect(
    await write(
      "posts/" + aPost + "/comments",
      { body: "Useful advice", author_id: pa.id },
      b.cookie,
    ),
    201,
  ).id;
  assert.equal(
    expect(await read("posts/" + aPost + "/comments", a.cookie), 200)
      .comments[0].author.id,
    pb.id,
  );
  expect(await write("comments/" + comment, {}, a.cookie, "DELETE"), 404);
  assert(
    expect(await read("notifications", a.cookie), 200).notifications.some(
      (n) => n.kind === "comment" && n.actor.id === pb.id,
    ),
  );
  expect(await write("notifications/read", {}, a.cookie), 200);
  assert.equal(expect(await read("me", a.cookie), 200).unread, 0);
  const form = new FormData();
  form.set(
    "file",
    new File([Buffer.from(images[0].base64, "base64")], "photo.png", {
      type: images[0].mime,
    }),
  );
  const upload = expect(await write("upload", form, a.cookie), 200);
  assert.match(upload.url, /^\/api\/uploads\//);
  expect(
    await write("posts", { body: "Photo post", image: upload.url }, a.cookie),
    201,
  );
  expect(
    await write(
      "posts",
      { body: "Invalid remote image", image: "https://evil.example/image.png" },
      a.cookie,
    ),
    400,
  );
  expect(
    await write("posts/" + aPost + "/report", { reason: "spam" }, b.cookie),
    200,
  );
  expect(
    await write("posts/" + aPost + "/report", { reason: "spam" }, b.cookie),
    200,
  );
  const adminLogin = await req("admin/login", {
    method: "POST",
    body: { password: process.env.ADMIN_PASSWORD },
  });
  expect(adminLogin, 200);
  const adminCookie = adminLogin.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  expect(await read("admin/reports", b.cookie), 401);
  const reports = expect(
    await read("admin/reports", adminCookie),
    200,
  ).reports.filter((r) => r.post_id === aPost);
  assert.equal(reports.length, 1);
  expect(
    await write("admin/posts/" + aPost, { hidden: true }, adminCookie),
    200,
  );
  assert.equal(expect(await read("feed?post=" + aPost), 200).posts.length, 0);
  expect(
    await write("posts/" + aPost + "/comments", { body: "Hidden" }, b.cookie),
    404,
  );
  expect(
    await write("admin/posts/" + aPost, { hidden: false }, adminCookie),
    200,
  );
  expect(await write("follow/" + pa.id, { following: true }, b.cookie), 200);
  expect(await write("blocks/" + pb.id, { blocked: true }, a.cookie), 200);
  assert.equal(expect(await read("me", a.cookie), 200).unread, 0);
  expect(await read("profiles/" + pa.id, b.cookie), 404);
  expect(await read("profiles/" + pb.id, a.cookie), 404);
  expect(
    await write("posts/" + aPost + "/comments", { body: "Blocked" }, b.cookie),
    404,
  );
  assert(
    !expect(await read("feed", a.cookie), 200).posts.some(
      (p) => p.author.id === pb.id,
    ),
  );
  assert.equal(expect(await read("blocks", a.cookie), 200).people[0].id, pb.id);
  expect(await write("blocks/" + pb.id, { blocked: false }, a.cookie), 200);
  expect(await read("profiles/" + pb.id, a.cookie), 200);
  expect(await write("comments/" + comment, {}, b.cookie, "DELETE"), 200);
  // Hiding a profile hides its posts without destroying their data.
  expect(
    await write(
      "profile",
      input("Network Learner B", { published: false }),
      b.cookie,
    ),
    200,
  );
  expect(await read("profiles/" + pb.id), 404);
  assert(!expect(await read("feed"), 200).posts.some((p) => p.id === bPost));
  expect(await write("profile", input("Network Learner B"), b.cookie), 200);
  // Both sessions are required for linking, and the public mentor identity survives.
  expect(await write("link-mentor", {}, a.cookie), 403);
  expect(await write("follow/" + pa.id, { following: true }, b.cookie), 200);
  const linked = expect(
    await write("link-mentor", {}, a.cookie + "; " + m.cookie),
    200,
  );
  assert.equal(linked.id, pm.id);
  assert.equal(expect(await read("me", a.cookie), 200).profile.id, pm.id);
  assert.equal(expect(await read("me", m.cookie), 200).profile.id, pm.id);
  assert.equal(
    expect(await read("feed?post=" + aPost), 200).posts[0].author.id,
    pm.id,
  );
  assert.equal(
    expect(await read("profiles/" + pm.id, b.cookie), 200).profile.following,
    true,
  );
  assert.equal(
    expect(await read("feed?mode=saved", b.cookie), 200).posts[0].id,
    aPost,
  );
  expect(await write("link-mentor", {}, b.cookie + "; " + m.cookie), 409);
  // Backend account restrictions also apply to an older mentor session after linking.
  await db.query("UPDATE users SET is_blocked=true WHERE id=$1", [a.id]);
  expect(await write("posts", { body: "Blocked account" }, a.cookie), 403);
  expect(
    await write("posts", { body: "Blocked linked mentor" }, m.cookie),
    401,
  );
  expect(await read("profiles/" + pm.id), 404);
  await db.query("UPDATE users SET is_blocked=false WHERE id=$1", [a.id]);
  // Cursor pages are disjoint, including posts sharing the same millisecond.
  for (let i = 0; i < 24; i++)
    await db.query(
      "INSERT INTO network_posts(author_id,body,created_at) VALUES($1,$2,'2026-01-01T12:00:00.123Z')",
      [pb.id, "Pagination " + i],
    );
  let cursor = null;
  const seen = new Set();
  let pages = 0;
  do {
    const data = expect(
      await read(
        "feed?author=" +
          pb.id +
          (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      ),
      200,
    );
    for (const post of data.posts) {
      assert(!seen.has(post.id));
      seen.add(post.id);
    }
    cursor = data.nextCursor;
    pages++;
    assert(pages < 5);
  } while (cursor);
  assert.equal(seen.size, 25);
  expect(await read("feed?cursor=garbage"), 400);
  expect(await req("profile", { method: "DELETE", cookie: b.cookie }), 200);
  expect(await read("profiles/" + pb.id), 404);
  console.log(`Professional network: ${checks} HTTP/data checks passed`);
} finally {
  for (const id of mentorIds)
    await db.query("DELETE FROM counselors WHERE id=$1", [id]);
  for (const id of userIds)
    await db.query("DELETE FROM users WHERE id=$1", [id]);
  await db.end();
}
