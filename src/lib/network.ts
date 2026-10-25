import "server-only";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { postgres } from "./postgres";
import { resolveMentorFromRequest } from "./mentorSession";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "./adminSession";
import { isSameOrigin } from "./serverSecurity";
import { checkRateLimit } from "./rateLimit";
import { saveImage } from "./localUploads";
import {
  networkCursor,
  networkImage,
  networkProfileInput,
  networkText,
  networkUuid,
} from "./networkValidation";

type Actor = {
  id: string;
  user_id: string | null;
  counselor_id: string | null;
  published: boolean;
};
class NetworkError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
const profileFields = `p.id,p.counselor_id,p.name,p.headline,p.bio,p.location,p.skills,p.experience,p.education,p.website,p.image,p.published`;
const profileJson = `jsonb_build_object('id',p.id,'counselor_id',p.counselor_id,'name',p.name,'headline',p.headline,'image',p.image)`;
const profileJoins = `LEFT JOIN users u ON u.id=p.user_id LEFT JOIN counselors c ON c.id=p.counselor_id`;
const liveProfile = `(p.user_id IS NULL OR (u.id IS NOT NULL AND u.deleted_at IS NULL AND NOT u.is_blocked AND u.name IS DISTINCT FROM 'Deleted user'))
  AND (p.counselor_id IS NULL OR c.is_active)`;
const notBlocked = `NOT EXISTS(SELECT 1 FROM network_blocks b WHERE (b.blocker_id=$1 AND b.blocked_id=p.id) OR (b.blocked_id=$1 AND b.blocker_id=p.id))`;
const publicProfile = `${liveProfile} AND p.published AND ${notBlocked}`;
const profileStats = `(SELECT count(*)::int FROM network_follows WHERE followed_id=p.id) AS followers,
  EXISTS(SELECT 1 FROM network_follows WHERE follower_id=$1 AND followed_id=p.id) AS following`;

async function actor(request: Request): Promise<Actor | null> {
  const session = await auth();
  let found;
  if (session?.user?.id) {
    const user = (
      await postgres.query(
        "SELECT id,name,image,is_blocked,deleted_at FROM users WHERE id=$1",
        [session.user.id],
      )
    ).rows[0];
    if (!user || user.deleted_at || user.name === "Deleted user") return null;
    if (user.is_blocked) throw new NetworkError(403, "account_blocked");
    found = (
      await postgres.query(
        "SELECT id,user_id,counselor_id,published FROM network_profiles WHERE user_id=$1",
        [user.id],
      )
    ).rows[0];
    if (!found) {
      await postgres.query(
        `INSERT INTO network_profiles(user_id,name,image) VALUES($1,$2,$3) ON CONFLICT(user_id) DO NOTHING`,
        [
          user.id,
          user.name?.trim().length >= 2
            ? user.name.trim().slice(0, 120)
            : "Foydalanuvchi",
          networkImage(user.image) || "",
        ],
      );
      found = (
        await postgres.query(
          "SELECT id,user_id,counselor_id,published FROM network_profiles WHERE user_id=$1",
          [user.id],
        )
      ).rows[0];
    }
  } else {
    const mentor = await resolveMentorFromRequest(request);
    if (mentor)
      found = (
        await postgres.query(
          `SELECT p.id,p.user_id,p.counselor_id,p.published FROM network_profiles p ${profileJoins}
      WHERE p.counselor_id=$1 AND ${liveProfile}`,
          [mentor.counselorId],
        )
      ).rows[0];
  }
  if (found?.counselor_id) {
    const active = await postgres.query(
      "SELECT id FROM counselors WHERE id=$1 AND is_active",
      [found.counselor_id],
    );
    if (!active.rowCount) throw new NetworkError(403, "account_blocked");
  }
  return found || null;
}
async function admin() {
  return verifyAdminSession((await cookies()).get(ADMIN_SESSION_COOKIE)?.value);
}
function uuid(id: string | undefined) {
  if (!id || !networkUuid.test(id))
    throw new NetworkError(400, "invalid_input");
  return id;
}
async function body(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 30_000)
    throw new NetworkError(413, "too_large");
  const raw = await request.text();
  if (raw.length > 30_000) throw new NetworkError(413, "too_large");
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new NetworkError(400, "invalid_input");
  }
}
async function profile(id: string, viewer: string | null, own = false) {
  return (
    await postgres.query(
      `SELECT ${profileFields},${profileStats} FROM network_profiles p ${profileJoins}
    WHERE p.id=$2 AND ${liveProfile} AND ${notBlocked} AND (p.published OR ($3 AND p.id=$1))`,
      [viewer, id, own],
    )
  ).rows[0];
}
async function accessiblePost(id: string, viewer: string | null) {
  const post = (
    await postgres.query(
      `SELECT s.id,s.author_id FROM network_posts s JOIN network_profiles p ON p.id=s.author_id ${profileJoins}
    WHERE s.id=$2 AND NOT s.hidden AND ${publicProfile}`,
      [viewer, id],
    )
  ).rows[0];
  if (!post) throw new NetworkError(404, "not_found");
  return post as { id: string; author_id: string };
}
async function notify(
  recipient: string,
  from: string,
  kind: "follow" | "comment",
  post: string | null,
  key: string,
) {
  if (recipient === from) return;
  await postgres.query(
    `INSERT INTO network_notifications(recipient_id,actor_id,kind,post_id,dedupe_key)
    VALUES($1,$2,$3,$4,$5) ON CONFLICT(dedupe_key) DO NOTHING`,
    [recipient, from, kind, post, key],
  );
}

// Linking requires simultaneous proof of both accounts. Email similarity is never proof.
async function linkMentor(request: Request, me: Actor) {
  const mentor = await resolveMentorFromRequest(request);
  if (!me.user_id || !mentor)
    throw new NetworkError(403, "both_accounts_required");
  const client = await postgres.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('network-link'))",
    );
    const target = (
      await client.query(
        `SELECT id,user_id FROM network_profiles WHERE counselor_id=$1 FOR UPDATE`,
        [mentor.counselorId],
      )
    ).rows[0];
    const source = (
      await client.query(
        "SELECT id,user_id,counselor_id FROM network_profiles WHERE id=$1 FOR UPDATE",
        [me.id],
      )
    ).rows[0];
    if (
      !target ||
      !source ||
      (target.user_id && target.user_id !== me.user_id) ||
      (source.counselor_id && source.id !== target.id)
    ) {
      throw new NetworkError(409, "already_linked");
    }
    if (source.id !== target.id) {
      const ids = [source.id, target.id];
      for (const table of ["network_posts", "network_comments"]) {
        await client.query(
          `UPDATE ${table} SET author_id=$2 WHERE author_id=$1`,
          ids,
        );
      }
      for (const table of ["network_likes", "network_saves"]) {
        await client.query(
          `INSERT INTO ${table}(post_id,profile_id) SELECT post_id,$2 FROM ${table} WHERE profile_id=$1 ON CONFLICT DO NOTHING`,
          ids,
        );
      }
      for (const [table, from, to] of [
        ["network_follows", "follower_id", "followed_id"],
        ["network_blocks", "blocker_id", "blocked_id"],
      ]) {
        await client.query(
          `INSERT INTO ${table}(${from},${to})
          SELECT CASE WHEN ${from}=$1 THEN $2 ELSE ${from} END, CASE WHEN ${to}=$1 THEN $2 ELSE ${to} END
          FROM ${table} WHERE (${from}=$1 OR ${to}=$1) AND ${from}<>$2 AND ${to}<>$2 ON CONFLICT DO NOTHING`,
          ids,
        );
      }
      await client.query(
        `INSERT INTO network_reports(post_id,reporter_id,reason,resolved_at,created_at)
        SELECT post_id,$2,reason,resolved_at,created_at FROM network_reports WHERE reporter_id=$1 ON CONFLICT DO NOTHING`,
        ids,
      );
      await client.query(
        "UPDATE network_notifications SET recipient_id=$2 WHERE recipient_id=$1",
        ids,
      );
      await client.query(
        "UPDATE network_notifications SET actor_id=$2 WHERE actor_id=$1",
        ids,
      );
      await client.query(
        "DELETE FROM network_notifications WHERE recipient_id=actor_id",
      );
      await client.query("DELETE FROM network_profiles WHERE id=$1", [
        source.id,
      ]);
      await client.query("UPDATE network_profiles SET user_id=$1 WHERE id=$2", [
        me.user_id,
        target.id,
      ]);
      // A block takes precedence over follows inherited from either account.
      await client.query(
        `DELETE FROM network_follows f USING network_blocks b
        WHERE (f.follower_id=$1 OR f.followed_id=$1) AND
        ((f.follower_id=b.blocker_id AND f.followed_id=b.blocked_id) OR (f.followed_id=b.blocker_id AND f.follower_id=b.blocked_id))`,
        [target.id],
      );
    }
    await client.query("COMMIT");
    return json({ success: true, id: target.id });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function networkRequest(request: Request, path: string[]) {
  try {
    const method = request.method,
      url = new URL(request.url),
      route = path.join("/");
    if (method !== "GET" && !isSameOrigin(request))
      throw new NetworkError(403, "invalid_origin");
    if (path[0] === "admin") {
      if (!(await admin())) throw new NetworkError(401, "unauthorized");
      if (method === "GET" && route === "admin/reports") {
        return json({
          reports: (
            await postgres.query(`SELECT r.id,r.reason,r.created_at,r.resolved_at,s.id AS post_id,s.body,s.hidden,p.name AS author
          FROM network_reports r JOIN network_posts s ON s.id=r.post_id JOIN network_profiles p ON p.id=s.author_id
          ORDER BY (r.resolved_at IS NULL) DESC,r.created_at DESC LIMIT 100`)
          ).rows,
        });
      }
      if (method === "POST" && path[1] === "posts" && path.length === 3) {
        const id = uuid(path[2]),
          input = await body(request);
        if (typeof input.hidden !== "boolean")
          throw new NetworkError(400, "invalid_input");
        const client = await postgres.connect();
        try {
          await client.query("BEGIN");
          const changed = await client.query(
            "UPDATE network_posts SET hidden=$2 WHERE id=$1 RETURNING id",
            [id, input.hidden],
          );
          if (!changed.rowCount) throw new NetworkError(404, "not_found");
          await client.query(
            "UPDATE network_reports SET resolved_at=now() WHERE post_id=$1",
            [id],
          );
          await client.query(
            "INSERT INTO network_moderation_log(post_id,hidden) VALUES($1,$2)",
            [id, input.hidden],
          );
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
        return json({ success: true });
      }
      throw new NetworkError(404, "not_found");
    }
    const me = await actor(request),
      viewer = me?.id || null;
    if (method === "GET") {
      if (route === "me") {
        const mentor = await resolveMentorFromRequest(request);
        return json({
          profile: me ? await profile(me.id, me.id, true) : null,
          admin: await admin(),
          canLinkMentor: Boolean(me?.user_id && !me.counselor_id && mentor),
          unread: me
            ? (
                await postgres.query(
                  `SELECT count(*)::int AS count FROM network_notifications n
                   JOIN network_profiles p ON p.id=n.actor_id ${profileJoins}
                   WHERE n.recipient_id=$1 AND n.read_at IS NULL AND ${publicProfile}
                   AND (n.post_id IS NULL OR EXISTS(SELECT 1 FROM network_posts s WHERE s.id=n.post_id AND NOT s.hidden))`,
                  [me.id],
                )
              ).rows[0].count
            : 0,
        });
      }
      if (route === "people") {
        const search = (url.searchParams.get("q") || "").trim().slice(0, 100);
        const page = Math.min(
          400,
          Math.max(0, Number(url.searchParams.get("page")) || 0),
        );
        const result = await postgres.query(
          `SELECT ${profileFields},${profileStats} FROM network_profiles p ${profileJoins}
          WHERE ${publicProfile} AND ($2='' OR position(lower($2) in lower(p.name||' '||p.headline||' '||p.location||' '||array_to_string(p.skills,' ')))>0)
          AND ($3::boolean=false OR p.counselor_id IS NOT NULL)
          ORDER BY (p.counselor_id IS NOT NULL) DESC,p.name,p.id LIMIT 25 OFFSET $4`,
          [
            viewer,
            search,
            url.searchParams.get("mentors") === "true",
            Math.floor(page) * 24,
          ],
        );
        return json({
          people: result.rows.slice(0, 24),
          hasMore: result.rows.length > 24,
        });
      }
      if (path[0] === "profiles" && path.length === 2) {
        const result = await profile(uuid(path[1]), viewer, true);
        if (!result) throw new NetworkError(404, "not_found");
        return json({ profile: result });
      }
      if (route === "feed") {
        const mode = url.searchParams.get("mode") || "all";
        if (!["all", "following", "saved"].includes(mode))
          throw new NetworkError(400, "invalid_input");
        if (mode !== "all" && !me) throw new NetworkError(401, "unauthorized");
        const author = url.searchParams.get("author"),
          postId = url.searchParams.get("post");
        if (author) uuid(author);
        if (postId) uuid(postId);
        const rawCursor = url.searchParams.get("cursor"),
          cursor = networkCursor(rawCursor);
        if (rawCursor && !cursor) throw new NetworkError(400, "invalid_input");
        const result = await postgres.query(
          `SELECT s.id,s.body,s.image,s.created_at,s.edited_at,${profileJson} AS author,
          (SELECT count(*)::int FROM network_likes WHERE post_id=s.id) AS likes,
          (SELECT count(*)::int FROM network_comments WHERE post_id=s.id) AS comments,
          EXISTS(SELECT 1 FROM network_likes WHERE post_id=s.id AND profile_id=$1) AS liked,
          EXISTS(SELECT 1 FROM network_saves WHERE post_id=s.id AND profile_id=$1) AS saved
          FROM network_posts s JOIN network_profiles p ON p.id=s.author_id ${profileJoins}
          WHERE NOT s.hidden AND ${publicProfile} AND ($2::uuid IS NULL OR s.author_id=$2)
          AND ($3<>'following' OR EXISTS(SELECT 1 FROM network_follows WHERE follower_id=$1 AND followed_id=p.id) OR p.id=$1)
          AND ($3<>'saved' OR EXISTS(SELECT 1 FROM network_saves WHERE profile_id=$1 AND post_id=s.id))
          AND ($4::timestamptz IS NULL OR (s.created_at,s.id)<($4,$5::uuid)) AND ($6::uuid IS NULL OR s.id=$6)
          ORDER BY s.created_at DESC,s.id DESC LIMIT 21`,
          [
            viewer,
            author,
            mode,
            cursor?.time || null,
            cursor?.id || null,
            postId,
          ],
        );
        const posts = result.rows.slice(0, 20),
          last = posts.at(-1);
        return json({
          posts,
          nextCursor:
            result.rows.length > 20 && last
              ? Buffer.from(
                  JSON.stringify({ time: last.created_at, id: last.id }),
                ).toString("base64url")
              : null,
        });
      }
      if (path[0] === "posts" && path[2] === "comments" && path.length === 3) {
        const post = await accessiblePost(uuid(path[1]), viewer);
        const page = Math.min(
          400,
          Math.max(0, Number(url.searchParams.get("page")) || 0),
        );
        const result = await postgres.query(
          `SELECT m.id,m.body,m.created_at,${profileJson} AS author FROM network_comments m
          JOIN network_profiles p ON p.id=m.author_id ${profileJoins} WHERE m.post_id=$2 AND ${publicProfile}
          ORDER BY m.created_at,m.id LIMIT 31 OFFSET $3`,
          [viewer, post.id, Math.floor(page) * 30],
        );
        return json({
          comments: result.rows.slice(0, 30),
          hasMore: result.rows.length > 30,
        });
      }
      if (route === "notifications") {
        if (!me) throw new NetworkError(401, "unauthorized");
        return json({
          notifications: (
            await postgres.query(
              `SELECT n.id,n.kind,n.post_id,n.read_at,n.created_at,${profileJson} AS actor
          FROM network_notifications n JOIN network_profiles p ON p.id=n.actor_id ${profileJoins}
          WHERE n.recipient_id=$1 AND ${publicProfile} AND (n.post_id IS NULL OR EXISTS(SELECT 1 FROM network_posts s WHERE s.id=n.post_id AND NOT s.hidden))
          ORDER BY n.created_at DESC LIMIT 50`,
              [viewer],
            )
          ).rows,
        });
      }
      if (route === "blocks") {
        if (!me) throw new NetworkError(401, "unauthorized");
        return json({
          people: (
            await postgres.query(
              `SELECT p.id,p.name FROM network_blocks b JOIN network_profiles p ON p.id=b.blocked_id WHERE b.blocker_id=$1 ORDER BY p.name`,
              [viewer],
            )
          ).rows,
        });
      }
      throw new NetworkError(404, "not_found");
    }

    if (!me) throw new NetworkError(401, "unauthorized");
    const limit = await checkRateLimit(
      "network-write:" + me.id,
      120,
      15 * 60_000,
    );
    if (!limit.allowed)
      return Response.json(
        { error: "rate_limited", retryAfterSeconds: limit.retryAfterSeconds },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    if (route === "link-mentor" && method === "POST")
      return await linkMentor(request, me);
    if (route === "profile" && method === "POST") {
      const input = networkProfileInput(await body(request));
      if (!input) throw new NetworkError(400, "invalid_input");
      await postgres.query(
        `UPDATE network_profiles SET name=$2,headline=$3,bio=$4,location=$5,skills=$6,experience=$7,education=$8,website=$9,image=$10,published=$11 WHERE id=$1`,
        [
          me.id,
          input.name,
          input.headline,
          input.bio,
          input.location,
          input.skills,
          input.experience,
          input.education,
          input.website,
          input.image,
          input.published,
        ],
      );
      return json({ profile: await profile(me.id, me.id, true) });
    }
    if (route === "upload" && method === "POST") {
      const uploadLimit = await checkRateLimit(
        "network-upload:" + me.id,
        20,
        60 * 60_000,
      );
      if (!uploadLimit.allowed) throw new NetworkError(429, "rate_limited");
      if (Number(request.headers.get("content-length") || 0) > 6 * 1024 * 1024)
        throw new NetworkError(413, "too_large");
      const form = await request.formData().catch(() => null),
        file = form?.get("file");
      if (!(file instanceof File)) throw new NetworkError(400, "invalid_image");
      try {
        return json({ url: await saveImage(file) });
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("invalid_"))
          throw new NetworkError(400, "invalid_image");
        throw error;
      }
    }
    if (route === "notifications/read" && method === "POST") {
      await postgres.query(
        "UPDATE network_notifications SET read_at=now() WHERE recipient_id=$1 AND read_at IS NULL",
        [me.id],
      );
      return json({ success: true });
    }
    if (path[0] === "blocks" && path.length === 2 && method === "POST") {
      const target = uuid(path[1]),
        input = await body(request);
      if (target === me.id || typeof input.blocked !== "boolean")
        throw new NetworkError(400, "invalid_input");
      if (input.blocked) {
        if (!(await profile(target, me.id)))
          throw new NetworkError(404, "not_found");
        const client = await postgres.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            "INSERT INTO network_blocks(blocker_id,blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
            [me.id, target],
          );
          await client.query(
            "DELETE FROM network_follows WHERE (follower_id=$1 AND followed_id=$2) OR (followed_id=$1 AND follower_id=$2)",
            [me.id, target],
          );
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      } else
        await postgres.query(
          "DELETE FROM network_blocks WHERE blocker_id=$1 AND blocked_id=$2",
          [me.id, target],
        );
      return json({ success: true });
    }
    if (method === "DELETE" && path[0] === "posts" && path.length === 2) {
      const result = await postgres.query(
        "DELETE FROM network_posts WHERE id=$1 AND author_id=$2 RETURNING id",
        [uuid(path[1]), me.id],
      );
      if (!result.rowCount) throw new NetworkError(404, "not_found");
      return json({ success: true });
    }
    if (method === "DELETE" && path[0] === "comments" && path.length === 2) {
      const result = await postgres.query(
        "DELETE FROM network_comments WHERE id=$1 AND author_id=$2 RETURNING id",
        [uuid(path[1]), me.id],
      );
      if (!result.rowCount) throw new NetworkError(404, "not_found");
      return json({ success: true });
    }
    if (!me.published) throw new NetworkError(409, "profile_required");
    if (path[0] === "follow" && path.length === 2 && method === "POST") {
      const target = uuid(path[1]),
        input = await body(request);
      if (target === me.id || typeof input.following !== "boolean")
        throw new NetworkError(400, "invalid_input");
      if (!(await profile(target, me.id)))
        throw new NetworkError(404, "not_found");
      if (input.following) {
        await postgres.query(
          "INSERT INTO network_follows(follower_id,followed_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [me.id, target],
        );
        await notify(
          target,
          me.id,
          "follow",
          null,
          `follow:${me.id}:${target}`,
        );
      } else
        await postgres.query(
          "DELETE FROM network_follows WHERE follower_id=$1 AND followed_id=$2",
          [me.id, target],
        );
      return json({ success: true });
    }
    if (route === "posts" && method === "POST") {
      const input = await body(request),
        text = networkText(input.body, 3000, 1),
        image = networkImage(input.image || "");
      if (
        !text ||
        image === null ||
        (image && !image.startsWith("/api/uploads/"))
      )
        throw new NetworkError(400, "invalid_input");
      const result = await postgres.query(
        "INSERT INTO network_posts(author_id,body,image) VALUES($1,$2,$3) RETURNING id",
        [me.id, text, image],
      );
      return json({ id: result.rows[0].id }, 201);
    }
    if (path[0] === "posts" && path.length === 2 && method === "PATCH") {
      const input = await body(request),
        text = networkText(input.body, 3000, 1);
      if (!text) throw new NetworkError(400, "invalid_input");
      const result = await postgres.query(
        "UPDATE network_posts SET body=$3,edited_at=now() WHERE id=$1 AND author_id=$2 AND NOT hidden RETURNING id",
        [uuid(path[1]), me.id, text],
      );
      if (!result.rowCount) throw new NetworkError(404, "not_found");
      return json({ success: true });
    }
    if (path[0] === "posts" && path.length === 3 && method === "POST") {
      const post = await accessiblePost(uuid(path[1]), me.id),
        input = await body(request);
      if (path[2] === "like" || path[2] === "save") {
        if (typeof input.active !== "boolean")
          throw new NetworkError(400, "invalid_input");
        const table = path[2] === "like" ? "network_likes" : "network_saves";
        if (input.active)
          await postgres.query(
            `INSERT INTO ${table}(post_id,profile_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
            [post.id, me.id],
          );
        else
          await postgres.query(
            `DELETE FROM ${table} WHERE post_id=$1 AND profile_id=$2`,
            [post.id, me.id],
          );
        return json({ success: true });
      }
      if (path[2] === "comments") {
        const text = networkText(input.body, 1000, 1);
        if (!text) throw new NetworkError(400, "invalid_input");
        const comment = (
          await postgres.query(
            "INSERT INTO network_comments(post_id,author_id,body) VALUES($1,$2,$3) RETURNING id",
            [post.id, me.id, text],
          )
        ).rows[0];
        await notify(
          post.author_id,
          me.id,
          "comment",
          post.id,
          `comment:${comment.id}`,
        );
        return json({ id: comment.id }, 201);
      }
      if (path[2] === "report") {
        if (!["spam", "abuse", "other"].includes(String(input.reason)))
          throw new NetworkError(400, "invalid_input");
        await postgres.query(
          "INSERT INTO network_reports(post_id,reporter_id,reason) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
          [post.id, me.id, input.reason],
        );
        return json({ success: true });
      }
    }
    throw new NetworkError(404, "not_found");
  } catch (error) {
    if (error instanceof NetworkError)
      return json({ error: error.message }, error.status);
    console.error(
      "[NETWORK_REQUEST_FAILED]",
      error instanceof Error ? error.message : "unknown",
    );
    return json({ error: "unavailable" }, 503);
  }
}
