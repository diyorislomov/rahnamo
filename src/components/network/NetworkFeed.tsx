"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import {
  ArrowRight,
  Bookmark,
  ImagePlus,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  ShieldCheck,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import type { NetworkComment, NetworkPost } from "@/lib/networkTypes";
import {
  networkApi,
  useNetwork,
  useNetworkCopy,
  writeNetwork,
} from "./NetworkProvider";
import {
  Avatar,
  Busy,
  Confirm,
  Empty,
  ErrorBox,
  LoginPrompt,
  NetworkShell,
  useRemote,
} from "./NetworkUI";

export async function uploadNetworkImage(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("invalid_image");
  const form = new FormData();
  form.set("file", file);
  return (
    await networkApi<{ url: string }>("upload", { method: "POST", body: form })
  ).url;
}
export function Composer({ onPosted }: { onPosted: () => void }) {
  const { me, loading } = useNetwork(),
    t = useNetworkCopy();
  const [text, setText] = useState(""),
    [image, setImage] = useState(""),
    [pending, setPending] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState<unknown>(null);
  const flight = useRef(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (flight.current || !text.trim() || uploading) return;
    flight.current = true;
    setPending(true);
    setError(null);
    try {
      await writeNetwork("posts", { body: text, image });
      setText("");
      setImage("");
      onPosted();
    } catch (failure) {
      setError(failure);
    } finally {
      flight.current = false;
      setPending(false);
    }
  }
  if (loading) return null;
  if (!me.profile)
    return (
      <div id="compose">
        <LoginPrompt />
      </div>
    );
  if (!me.profile.published)
    return (
      <div id="compose" className="network-notice">
        {t.profileRequired}
        <Link className="network-text-link" href="/settings/profile">
          {t.completeProfile}
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  return (
    <form
      id="compose"
      className="network-card network-composer"
      onSubmit={submit}
      aria-label={t.newPost}
    >
      <div className="network-composer-top">
        <Avatar person={me.profile} />
        <label className="sr-only" htmlFor="network-post-text">
          {t.write}
        </label>
        <textarea
          id="network-post-text"
          value={text}
          maxLength={3000}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.placeholder}
          rows={3}
          disabled={pending}
        />
      </div>
      {image && (
        <div className="network-upload-preview">
          <img src={image} alt={t.photo} />
          <button
            type="button"
            className="network-icon-button"
            aria-label={t.removePhoto}
            onClick={() => setImage("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {Boolean(error) && <ErrorBox error={error} />}
      <div className="network-composer-bottom">
        <label className="network-photo-button">
          {uploading ? (
            <Loader2 size={18} className="network-spin" />
          ) : (
            <ImagePlus size={18} />
          )}
          <span>{t.photo}</span>
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={pending || uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setUploading(true);
              setError(null);
              try {
                setImage(await uploadNetworkImage(file));
              } catch (failure) {
                setError(failure);
              } finally {
                setUploading(false);
              }
            }}
          />
        </label>
        <div className="network-composer-note">
          <span>{t.publicPost}</span>
          {text.length > 2800 && <span>{text.length}/3000</span>}
          <button
            type="submit"
            className="network-button small"
            disabled={pending || uploading || !text.trim()}
          >
            {pending ? (
              <Loader2 size={15} className="network-spin" />
            ) : (
              <Send size={14} />
            )}{" "}
            {t.publish}
          </button>
        </div>
      </div>
    </form>
  );
}
export function PostCard({
  post,
  onRemoved,
}: {
  post: NetworkPost;
  onRemoved: () => void;
}) {
  const router = useRouter();
  const { me, refresh } = useNetwork(),
    t = useNetworkCopy(),
    locale = useLocale();
  const [liked, setLiked] = useState(post.liked),
    [saved, setSaved] = useState(post.saved),
    [likes, setLikes] = useState(post.likes),
    [count, setCount] = useState(post.comments);
  const [postBody, setPostBody] = useState(post.body),
    [draft, setDraft] = useState(post.body),
    [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false),
    flight = useRef(false),
    [error, setError] = useState<unknown>(null),
    [notice, setNotice] = useState("");
  const [showComments, setShowComments] = useState(false),
    [commentBody, setCommentBody] = useState(""),
    [extraComments, setExtraComments] = useState<NetworkComment[]>([]),
    [commentPage, setCommentPage] = useState(0),
    [extraHasMore, setExtraHasMore] = useState<boolean | null>(null);
  const comments = useRemote<{ comments: NetworkComment[]; hasMore: boolean }>(
    showComments ? "posts/" + post.id + "/comments" : null,
  );
  const [confirm, setConfirm] = useState<"delete" | "report" | "block" | null>(
      null,
    ),
    [reason, setReason] = useState("spam");
  const mine = me.profile?.id === post.author.id;
  const authenticated = () => {
    if (!me.profile) {
      router.push("/login?redirect=" + encodeURIComponent("/?post=" + post.id));
      return false;
    }
    if (!me.profile.published) {
      router.push("/settings/profile");
      return false;
    }
    return true;
  };
  async function perform(action: () => Promise<void>) {
    if (flight.current) return;
    flight.current = true;
    setPending(true);
    setError(null);
    setNotice("");
    try {
      await action();
    } catch (failure) {
      setError(failure);
    } finally {
      flight.current = false;
      setPending(false);
    }
  }
  const closeMenu = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.closest("details")?.removeAttribute("open");
  };
  return (
    <article className="network-card network-post" id={"post-" + post.id}>
      <div className="network-post-head">
        <Link
          className="network-post-author"
          href={"/people/" + post.author.id}
        >
          <Avatar person={post.author} />
          <div>
            <h3>
              {post.author.name}
              {post.author.counselor_id && (
                <ShieldCheck size={14} aria-label={t.mentor} />
              )}
            </h3>
            <p>{post.author.headline || t.noHeadline}</p>
            <time dateTime={post.created_at}>
              {new Date(post.created_at).toLocaleDateString(locale, {
                day: "numeric",
                month: "short",
              })}
              {post.edited_at ? " · " + t.edited : ""}
            </time>
          </div>
        </Link>
        <details className="network-post-menu">
          <summary className="network-icon-button" aria-label={t.postMenu}>
            <MoreHorizontal size={20} />
          </summary>
          <div className="network-dropdown">
            {mine ? (
              <>
                <button
                  onClick={(e) => {
                    closeMenu(e);
                    setDraft(postBody);
                    setEditing(true);
                  }}
                >
                  {t.edit}
                </button>
                <button
                  onClick={(e) => {
                    closeMenu(e);
                    setConfirm("delete");
                  }}
                >
                  {t.remove}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    closeMenu(e);
                    if (authenticated()) setConfirm("report");
                  }}
                >
                  {t.report}
                </button>
                <button
                  onClick={(e) => {
                    closeMenu(e);
                    if (authenticated()) setConfirm("block");
                  }}
                >
                  {t.block}
                </button>
              </>
            )}
          </div>
        </details>
      </div>
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void perform(async () => {
              await writeNetwork("posts/" + post.id, { body: draft }, "PATCH");
              setPostBody(draft.trim());
              setEditing(false);
            });
          }}
        >
          <label className="network-field">
            <span className="sr-only">{t.edit}</span>
            <textarea
              rows={5}
              maxLength={3000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
          <div className="network-dialog-actions">
            <button
              type="button"
              className="network-button secondary small"
              onClick={() => setEditing(false)}
            >
              {t.cancel}
            </button>
            <button
              className="network-button small"
              disabled={pending || !draft.trim()}
            >
              {t.saveChanges}
            </button>
          </div>
        </form>
      ) : (
        <p className="network-post-body">{postBody}</p>
      )}
      {post.image && (
        <img
          src={post.image}
          alt={t.photo}
          className="network-post-image"
          loading="lazy"
        />
      )}
      <div className="network-post-meta">
        <span>{likes > 0 ? `${likes} ${t.like.toLowerCase()}` : ""}</span>
        <button onClick={() => setShowComments((v) => !v)}>
          {count > 0 ? `${count} ${t.comment.toLowerCase()}` : ""}
        </button>
      </div>
      <div className="network-post-actions">
        <button
          aria-pressed={liked}
          disabled={pending}
          onClick={() => {
            if (authenticated())
              void perform(async () => {
                await writeNetwork("posts/" + post.id + "/like", {
                  active: !liked,
                });
                setLikes((n) => n + (liked ? -1 : 1));
                setLiked(!liked);
              });
          }}
        >
          <ThumbsUp size={18} />
          <span>{t.like}</span>
        </button>
        <button
          aria-expanded={showComments}
          onClick={() => setShowComments((v) => !v)}
        >
          <MessageCircle size={18} />
          <span>{t.comment}</span>
        </button>
        <button
          aria-pressed={saved}
          disabled={pending}
          onClick={() => {
            if (authenticated())
              void perform(async () => {
                await writeNetwork("posts/" + post.id + "/save", {
                  active: !saved,
                });
                setSaved(!saved);
              });
          }}
        >
          <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
          <span>{saved ? t.unsave : t.save}</span>
        </button>
        <button
          aria-label={t.share}
          onClick={() =>
            void perform(async () => {
              await navigator.clipboard.writeText(
                window.location.origin + "/?post=" + post.id,
              );
              setNotice(t.copied);
            })
          }
        >
          <Share2 size={18} />
        </button>
      </div>
      {notice && (
        <p className="network-success" role="status">
          {notice}
        </p>
      )}
      {Boolean(error) && <ErrorBox error={error} />}
      {showComments && (
        <section className="network-comments" aria-label={t.comment}>
          {comments.loading ? (
            <Busy />
          ) : comments.error ? (
            <ErrorBox error={comments.error} retry={comments.reload} />
          ) : (
            <>
              {[...(comments.data?.comments || []), ...extraComments].map(
                (comment) => (
                  <div className="network-comment" key={comment.id}>
                    <Link href={"/people/" + comment.author.id}>
                      <Avatar person={comment.author} size={30} />
                    </Link>
                    <div className="network-comment-content">
                      <Link href={"/people/" + comment.author.id}>
                        <strong>{comment.author.name}</strong>
                      </Link>
                      <p>{comment.body}</p>
                    </div>
                    {comment.author.id === me.profile?.id && (
                      <button
                        className="network-icon-button"
                        disabled={pending}
                        aria-label={t.remove}
                        onClick={() =>
                          void perform(async () => {
                            await networkApi("comments/" + comment.id, {
                              method: "DELETE",
                            });
                            setExtraComments([]);
                            setCommentPage(0);
                            setExtraHasMore(null);
                            comments.reload();
                            setCount((n) => Math.max(0, n - 1));
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ),
              )}
              {!comments.data?.comments.length && (
                <p className="network-composer-note">{t.noComments}</p>
              )}
              {(extraHasMore ?? comments.data?.hasMore) && (
                <button
                  className="network-text-link"
                  disabled={pending}
                  onClick={() =>
                    void perform(async () => {
                      const next = commentPage + 1;
                      const result = await networkApi<{
                        comments: NetworkComment[];
                        hasMore: boolean;
                      }>(`posts/${post.id}/comments?page=${next}`);
                      setExtraComments((items) => [
                        ...items,
                        ...result.comments,
                      ]);
                      setCommentPage(next);
                      setExtraHasMore(result.hasMore);
                    })
                  }
                >
                  {t.more}
                </button>
              )}
            </>
          )}
          <form
            className="network-comment-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!commentBody.trim() || !authenticated()) return;
              void perform(async () => {
                await writeNetwork("posts/" + post.id + "/comments", {
                  body: commentBody,
                });
                setCommentBody("");
                setExtraComments([]);
                setCommentPage(0);
                setExtraHasMore(null);
                comments.reload();
                setCount((n) => n + 1);
                void refresh();
              });
            }}
          >
            <label className="sr-only" htmlFor={"comment-" + post.id}>
              {t.comment}
            </label>
            <textarea
              id={"comment-" + post.id}
              className="network-input"
              rows={1}
              value={commentBody}
              maxLength={1000}
              placeholder={t.commentPlaceholder}
              onChange={(e) => setCommentBody(e.target.value)}
            />
            <button
              type="submit"
              className="network-button"
              disabled={pending || !commentBody.trim()}
              aria-label={t.send}
            >
              <Send size={16} />
            </button>
          </form>
        </section>
      )}
      {confirm && (
        <Confirm
          title={
            confirm === "delete"
              ? t.confirmDelete
              : confirm === "block"
                ? t.blockConfirm
                : t.reportTitle
          }
          pending={pending}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            void perform(async () => {
              if (confirm === "delete") {
                await networkApi("posts/" + post.id, { method: "DELETE" });
                onRemoved();
              }
              if (confirm === "block") {
                await writeNetwork("blocks/" + post.author.id, {
                  blocked: true,
                });
                onRemoved();
              }
              if (confirm === "report") {
                await writeNetwork("posts/" + post.id + "/report", { reason });
                setNotice(t.reported);
              }
              setConfirm(null);
            })
          }
        >
          {confirm === "report" &&
            (["spam", "abuse", "other"] as const).map((value) => (
              <label key={value} className="network-report-reason">
                <input
                  type="radio"
                  name={"reason-" + post.id}
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                />
                {t[value]}
              </label>
            ))}
          {Boolean(error) && <ErrorBox error={error} />}
        </Confirm>
      )}
    </article>
  );
}
export function FeedList({
  mode = "all",
  author,
  postId,
  revision = 0,
}: {
  mode?: string;
  author?: string;
  postId?: string;
  revision?: number;
}) {
  const { me, loading: checking } = useNetwork(),
    t = useNetworkCopy();
  const [posts, setPosts] = useState<NetworkPost[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [loadedKey, setLoadedKey] = useState(""),
    [moreLoading, setMoreLoading] = useState(false),
    [error, setError] = useState<unknown>(null),
    [refresh, setRefresh] = useState(0);
  const path =
    "feed?mode=" +
    mode +
    (author ? "&author=" + author : "") +
    (postId ? "&post=" + postId : "");
  const generation = useRef(0);
  const requestKey =
    path + ":" + revision + ":" + refresh + ":" + (me.profile?.id || "guest");
  useEffect(() => {
    if (checking) return;
    const current = ++generation.current;
    const controller = new AbortController();
    networkApi<{ posts: NetworkPost[]; nextCursor: string | null }>(path, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setPosts(data.posts);
          setCursor(data.nextCursor);
          setError(null);
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure);
      })
      .finally(() => {
        if (!controller.signal.aborted && current === generation.current) {
          setLoadedKey(requestKey);
          setMoreLoading(false);
        }
      });
    return () => {
      controller.abort();
      generation.current++;
    };
  }, [path, requestKey, checking]);
  async function more() {
    if (!cursor || moreLoading) return;
    const current = generation.current;
    setMoreLoading(true);
    try {
      const result = await networkApi<{
        posts: NetworkPost[];
        nextCursor: string | null;
      }>(path + "&cursor=" + encodeURIComponent(cursor));
      if (current !== generation.current) return;
      setPosts((p) => [
        ...p,
        ...result.posts.filter((next) => !p.some((old) => old.id === next.id)),
      ]);
      setCursor(result.nextCursor);
    } catch (failure) {
      if (current === generation.current) setError(failure);
    } finally {
      if (current === generation.current) setMoreLoading(false);
    }
  }
  if (checking || loadedKey !== requestKey) return <Busy />;
  if (error)
    return <ErrorBox error={error} retry={() => setRefresh((v) => v + 1)} />;
  return (
    <div className="network-feed">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onRemoved={() => setRefresh((v) => v + 1)}
        />
      ))}
      {!posts.length && (
        <div className="network-card">
          <Empty
            title={
              mode === "saved"
                ? t.emptySaved
                : mode === "following"
                  ? t.emptyFollowing
                  : postId
                    ? t.notFound
                    : t.emptyFeed
            }
            description={
              mode === "saved"
                ? t.emptySavedBody
                : mode === "following"
                  ? t.emptyFollowingBody
                  : postId
                    ? undefined
                    : t.emptyFeedBody
            }
          >
            <Link className="network-button secondary small" href="/people">
              {t.discover}
              <ArrowRight size={14} />
            </Link>
            {!postId && mode !== "saved" && (
              <Link className="network-button small" href="/mentors">
                {t.findMentor}
                <ArrowRight size={14} />
              </Link>
            )}
          </Empty>
        </div>
      )}
      {cursor && (
        <button
          className="network-button secondary"
          disabled={moreLoading}
          onClick={more}
        >
          {moreLoading ? t.loading : t.more}
        </button>
      )}
    </div>
  );
}
export default function NetworkFeed({
  saved = false,
  postId,
}: {
  saved?: boolean;
  postId?: string;
}) {
  const router = useRouter();
  const { me, error, refresh } = useNetwork(),
    t = useNetworkCopy();
  const [mode, setMode] = useState(saved ? "saved" : "all"),
    [revision, setRevision] = useState(0);
  return (
    <NetworkShell>
      <div className="network-welcome">
        <h1>{saved ? t.saved : t.welcome}</h1>
        {!saved && <p>{t.intro}</p>}
      </div>
      {Boolean(error) && (
        <ErrorBox error={error} retry={() => void refresh()} />
      )}{" "}
      {!saved && !postId && (
        <Composer
          onPosted={() => {
            setMode("all");
            setRevision((v) => v + 1);
          }}
        />
      )}
      {!saved && !postId && (
        <div className="network-tabs" role="group" aria-label={t.feed}>
          <button
            className={mode === "all" ? "active" : ""}
            aria-pressed={mode === "all"}
            onClick={() => setMode("all")}
          >
            {t.all}
          </button>
          <button
            className={mode === "following" ? "active" : ""}
            aria-pressed={mode === "following"}
            onClick={() => {
              if (me.profile) setMode("following");
              else router.push("/login?redirect=/");
            }}
          >
            {t.following}
          </button>
        </div>
      )}
      {saved && !me.profile ? (
        <LoginPrompt />
      ) : (
        <FeedList mode={mode} revision={revision} postId={postId} />
      )}
    </NetworkShell>
  );
}
