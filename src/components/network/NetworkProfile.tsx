"use client";
import Link from "next/link";
import { MapPin, ArrowUpRight, Pencil, ShieldCheck, Users } from "lucide-react";
import type { NetworkProfile as Profile } from "@/lib/networkTypes";
import { useNetwork, useNetworkCopy } from "./NetworkProvider";
import {
  Avatar,
  Busy,
  Empty,
  ErrorBox,
  FollowButton,
  NetworkShell,
  useRemote,
} from "./NetworkUI";
import { FeedList } from "./NetworkFeed";

export default function NetworkProfile({ id }: { id: string }) {
  const { me } = useNetwork(),
    t = useNetworkCopy(),
    result = useRemote<{ profile: Profile }>("profiles/" + id);
  const p = result.data?.profile,
    mine = p?.id === me.profile?.id;
  return (
    <NetworkShell>
      {result.loading ? (
        <Busy />
      ) : result.error ? (
        <ErrorBox error={result.error} retry={result.reload} />
      ) : !p ? (
        <Empty title={t.noProfile} />
      ) : (
        <>
          {!p.published && mine && (
            <div className="network-notice">
              {t.privateProfile}
              <Link className="network-text-link" href="/settings/profile">
                {t.editProfile}
              </Link>
            </div>
          )}
          <section className="network-card">
            <div className="network-profile-cover" />
            <div className="network-profile-main">
              <div className="network-profile-top">
                <Avatar person={p} size={100} />
                {mine ? (
                  <Link
                    className="network-button secondary small"
                    href="/settings/profile"
                  >
                    <Pencil size={14} />
                    {t.editProfile}
                  </Link>
                ) : (
                  <FollowButton person={p} onChange={result.reload} />
                )}
              </div>
              <h1>{p.name}</h1>
              <p className="network-profile-headline">
                {p.headline || t.noHeadline}
              </p>
              <div className="network-profile-meta">
                {p.location && (
                  <span>
                    <MapPin size={14} />
                    {p.location}
                  </span>
                )}
                <span>
                  <Users size={14} />
                  {p.followers} {t.followers}
                </span>
                {p.counselor_id && (
                  <span>
                    <ShieldCheck size={14} />
                    {t.mentor}
                  </span>
                )}
              </div>
              <div className="network-profile-actions">
                {p.counselor_id && (
                  <Link
                    className="network-button"
                    href={
                      mine
                        ? "/mentor/dashboard"
                        : "/counselors/" + p.counselor_id
                    }
                  >
                    {mine ? t.mentorOffice : t.advice}
                    <ArrowUpRight size={15} />
                  </Link>
                )}
                {p.website && (
                  <a
                    className="network-button secondary"
                    href={p.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    {t.website}
                    <ArrowUpRight size={15} />
                  </a>
                )}
              </div>
            </div>
          </section>
          {p.bio && (
            <section className="network-card network-profile-section">
              <h2>{t.about}</h2>
              <p>{p.bio}</p>
            </section>
          )}
          {!!p.skills.length && (
            <section className="network-card network-profile-section">
              <h2>{t.skills}</h2>
              <div className="network-tags">
                {p.skills.map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </div>
            </section>
          )}
          {p.experience && (
            <section className="network-card network-profile-section">
              <h2>{t.experience}</h2>
              <p>{p.experience}</p>
            </section>
          )}
          {p.education && (
            <section className="network-card network-profile-section">
              <h2>{t.education}</h2>
              <p>{p.education}</p>
            </section>
          )}
          {p.published && (
            <>
              <div className="network-section-heading">
                <h2>{t.posts}</h2>
              </div>
              <FeedList author={p.id} />
            </>
          )}
        </>
      )}
    </NetworkShell>
  );
}
