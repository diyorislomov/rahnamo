"use client";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  Check,
  House,
  Loader2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Avatar } from "./NetworkAvatar";
export { Avatar } from "./NetworkAvatar";
import type { NetworkProfile } from "@/lib/networkTypes";
import {
  networkApi,
  networkError,
  useNetwork,
  useNetworkCopy,
  writeNetwork,
} from "./NetworkProvider";

export function useRemote<T>(path: string | null) {
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    error: unknown;
  }>({ key: "", data: null, error: null });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const key = String(path) + ":" + version;
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    networkApi<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ key, data, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ key, data: null, error });
      });
    return () => controller.abort();
  }, [path, key]);
  return {
    data: state.key === key ? state.data : null,
    error: state.key === key ? state.error : null,
    loading: Boolean(path) && state.key !== key,
    reload,
  };
}
export function Busy() {
  const t = useNetworkCopy();
  return (
    <div className="network-loading" role="status">
      <Loader2 size={20} className="network-spin" />
      <span>{t.loading}</span>
    </div>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const t = useNetworkCopy();
  return (
    <div className="network-error" role="alert">
      {networkError(error, t)}
      {retry && (
        <button type="button" onClick={retry}>
          {t.retry}
        </button>
      )}
    </div>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="network-empty">
      <span className="network-empty-icon">
        <Users size={26} />
      </span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
export function LoginPrompt() {
  const t = useNetworkCopy();
  return (
    <section className="network-card">
      <Empty title={t.loginTitle} description={t.loginBody}>
        <Link
          className="network-button"
          href="/login?redirect=/settings/profile"
        >
          {t.join}
          <ArrowRight size={16} />
        </Link>
        <Link className="network-text-link" href="/mentor/dashboard">
          {t.mentorLogin}
        </Link>
      </Empty>
    </section>
  );
}
export function Confirm({
  title,
  children,
  onClose,
  onConfirm,
  pending = false,
}: {
  title: string;
  children?: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  pending?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId(),
    t = useNetworkCopy();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="network-dialog"
      aria-labelledby={id}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className="network-dialog-head">
        <h2 id={id}>{title}</h2>
        <button
          className="network-icon-button"
          onClick={onClose}
          disabled={pending}
          aria-label={t.cancel}
        >
          <X size={20} />
        </button>
      </div>
      {children}
      <div className="network-dialog-actions">
        <button
          className="network-button secondary"
          onClick={onClose}
          disabled={pending}
        >
          {t.cancel}
        </button>
        <button
          className="network-button"
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? (
            <Loader2 size={16} className="network-spin" />
          ) : (
            <Check size={16} />
          )}{" "}
          {t.send}
        </button>
      </div>
    </dialog>
  );
}
export function FollowButton({
  person,
  onChange,
}: {
  person: NetworkProfile;
  onChange?: () => void;
}) {
  const { me } = useNetwork(),
    t = useNetworkCopy(),
    [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(null);
  if (me.profile?.id === person.id) return null;
  if (!me.profile)
    return (
      <Link
        className="network-button secondary small"
        href="/login?redirect=/people"
      >
        {t.follow}
      </Link>
    );
  if (!me.profile.published)
    return (
      <Link className="network-button secondary small" href="/settings/profile">
        {t.follow}
      </Link>
    );
  const follow = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await writeNetwork("follow/" + person.id, {
        following: !person.following,
      });
      onChange?.();
    } catch (failure) {
      setError(failure);
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="network-follow">
      <button
        className={`network-button ${person.following ? "quiet" : "secondary"} small`}
        disabled={pending}
        aria-pressed={person.following}
        onClick={follow}
      >
        {pending ? (
          <Loader2 size={14} className="network-spin" />
        ) : person.following ? (
          <Check size={14} />
        ) : null}
        {person.following ? t.followed : t.follow}
      </button>
      {Boolean(error) && <ErrorBox error={error} />}
    </div>
  );
}
export function PersonCard({
  person,
  onChange,
  compact = false,
}: {
  person: NetworkProfile;
  onChange?: () => void;
  compact?: boolean;
}) {
  const t = useNetworkCopy();
  return (
    <article
      className={
        compact ? "network-person-compact" : "network-card network-person"
      }
    >
      <Link className="network-person-identity" href={"/people/" + person.id}>
        <Avatar person={person} size={compact ? 40 : 64} />
        <div>
          <h3>{person.name}</h3>
          <p>{person.headline || t.noHeadline}</p>
          {person.counselor_id && (
            <span className="network-mentor">
              <ShieldCheck size={13} />
              {t.mentor}
            </span>
          )}
        </div>
      </Link>
      {!compact && person.skills.length > 0 && (
        <div className="network-tags">
          {person.skills.slice(0, 3).map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
      )}
      <div className="network-person-actions">
        <FollowButton person={person} onChange={onChange} />
        {!compact && person.counselor_id && (
          <Link
            className="network-text-link"
            href={"/counselors/" + person.counselor_id}
          >
            {t.advice}
            <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </article>
  );
}
export function NetworkShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  const { me, loading } = useNetwork(),
    t = useNetworkCopy();
  const suggested = useRemote<{ people: NetworkProfile[] }>(
    "people?mentors=true",
  );
  const links = [
    { href: "/", label: t.feed, icon: House },
    { href: "/people", label: t.people, icon: Users },
    { href: "/mentors", label: t.mentors, icon: ShieldCheck },
    { href: "/saved", label: t.saved, icon: Bookmark },
    { href: "/my-bookings", label: t.bookings, icon: CalendarDays },
  ];
  return (
    <div className="network-page">
      <Navbar />
      <div className={`network-layout ${wide ? "network-layout-wide" : ""}`}>
        <aside className="network-sidebar">
          <div className="network-sticky">
            {me.profile ? (
              <div className="network-card network-self">
                <Link href={"/people/" + me.profile.id}>
                  <Avatar person={me.profile} size={58} />
                  <h2>{me.profile.name}</h2>
                  <p>{me.profile.headline || t.noHeadline}</p>
                </Link>
                <Link className="network-text-link" href="/settings/profile">
                  {t.editProfile}
                  <ArrowRight size={14} />
                </Link>
              </div>
            ) : !loading ? (
              <div className="network-card network-self">
                <h2>{t.welcome}</h2>
                <p>{t.loginBody}</p>
                <Link
                  className="network-button small"
                  href="/login?redirect=/settings/profile"
                >
                  {t.join}
                </Link>
              </div>
            ) : null}
            <nav className="network-side-nav" aria-label={t.feed}>
              {links.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <Icon size={19} />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="network-small-links">
              <Link href="/resources">{t.resources}</Link>
              <Link href="/privacy">{t.privacy}</Link>
              <Link href="/mentor/dashboard">{t.mentorOffice}</Link>
              {me.admin && <Link href="/admin/community">{t.moderation}</Link>}
              <span>© {new Date().getFullYear()} Rahnamo</span>
            </div>
          </div>
        </aside>
        <main id="main-content" className="network-main">
          {children}
        </main>
        {!wide && (
          <aside className="network-discover">
            <div className="network-sticky">
              <div className="network-card network-suggestions">
                <div className="network-section-heading">
                  <h2>{t.suggested}</h2>
                  <Link href="/people" aria-label={t.seeAll}>
                    <ArrowRight size={18} />
                  </Link>
                </div>
                {suggested.loading ? (
                  <Busy />
                ) : suggested.error ? (
                  <ErrorBox error={suggested.error} retry={suggested.reload} />
                ) : (
                  suggested.data?.people
                    .filter((p) => p.id !== me.profile?.id)
                    .slice(0, 3)
                    .map((person) => (
                      <PersonCard
                        key={person.id}
                        person={person}
                        compact
                        onChange={suggested.reload}
                      />
                    ))
                )}
                <Link className="network-text-link" href="/mentors">
                  {t.mentors}
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
