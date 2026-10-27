"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bell,
  Bookmark,
  CalendarDays,
  ChevronDown,
  House,
  LogOut,
  PenLine,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import { Avatar } from "./network/NetworkAvatar";
import { useNetwork, useNetworkCopy } from "./network/NetworkProvider";
import { mentorLogout } from "@/lib/mentorClient";
import { RahnamoRMark } from "./RahnamoLogo";

export default function Navbar() {
  const router = useRouter();
  const { me, loading, refresh } = useNetwork(),
    t = useNetworkCopy(),
    pathname = usePathname();
  const profileHref = me.profile
    ? "/people/" + me.profile.id
    : "/login?redirect=/settings/profile";
  const nav = [
    { href: "/", label: t.feed, icon: House, active: pathname === "/" },
    {
      href: "/people",
      label: t.people,
      icon: Users,
      active: pathname === "/people" || pathname === "/mentors",
    },
    {
      href: "/notifications",
      label: t.notifications,
      icon: Bell,
      active: pathname === "/notifications",
    },
  ];
  async function logout() {
    await mentorLogout();
    await signOut({ redirect: false });
    if (me.admin) await fetch("/api/admin/logout", { method: "POST" });
    await refresh();
    router.replace("/");
    router.refresh();
  }
  return (
    <>
      <a className="network-skip" href="#main-content">
        {t.feed}
      </a>
      <header className="network-header">
        <div className="network-header-inner">
          <Link className="network-brand" href="/" aria-label="Rahnamo">
            <span className="network-brand-mark">
              <RahnamoRMark className="w-[18px] h-[19px]" light={true} />
            </span>
            <span>
              rahnamo<span className="network-brand-dot">.</span>
            </span>
          </Link>
          <nav className="network-top-nav" aria-label={t.feed}>
            {nav.map(({ href, label, icon: Icon, active }) => (
              <Link
                key={href}
                href={href}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={19} />
                <span>{label}</span>
                {href === "/notifications" && me.unread > 0 && (
                  <b className="network-badge">{Math.min(me.unread, 99)}</b>
                )}
              </Link>
            ))}
          </nav>
          <div className="network-header-actions">
            <LanguageSwitcher />
            <Link
              href="/#compose"
              className="network-button small network-write"
            >
              <PenLine size={16} />
              <span>{t.write}</span>
            </Link>
            {me.profile || me.admin ? (
              <details className="network-account">
                <summary aria-label={t.profile}>
                  <Avatar person={me.profile || { name: "Admin" }} size={34} />
                  <ChevronDown size={14} />
                </summary>
                <div className="network-dropdown">
                  <Link href={profileHref}>{t.profile}</Link>
                  <Link href="/settings/profile">
                    <Settings size={16} />
                    {t.editProfile}
                  </Link>
                  <Link href="/saved">
                    <Bookmark size={16} />
                    {t.saved}
                  </Link>
                  <Link href="/my-bookings">
                    <CalendarDays size={16} />
                    {t.bookings}
                  </Link>
                  <Link href="/mentor/dashboard">
                    <ShieldCheck size={16} />
                    {t.mentorOffice}
                  </Link>
                  <Link href="/profile">{t.account}</Link>
                  {me.admin && (
                    <Link href="/admin/community">{t.moderation}</Link>
                  )}
                  <button onClick={logout}>
                    <LogOut size={16} />
                    {t.logout}
                  </button>
                </div>
              </details>
            ) : !loading ? (
              <Link
                className="network-button secondary small"
                href="/login?redirect=/settings/profile"
              >
                {t.login}
              </Link>
            ) : (
              <span className="network-avatar-placeholder" />
            )}
          </div>
        </div>
      </header>
      <nav className="network-mobile-nav" aria-label={t.feed}>
        {nav.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            className={active ? "active" : ""}
            aria-current={active ? "page" : undefined}
          >
            <span>
              <Icon size={21} />
              {href === "/notifications" && me.unread > 0 && <i />}
            </span>
            {label}
          </Link>
        ))}
        <Link
          href={profileHref}
          className={pathname === profileHref ? "active" : ""}
        >
          <span>
            {me.profile ? (
              <Avatar person={me.profile} size={23} />
            ) : (
              <Users size={21} />
            )}
          </span>
          {t.profile}
        </Link>
      </nav>
    </>
  );
}
