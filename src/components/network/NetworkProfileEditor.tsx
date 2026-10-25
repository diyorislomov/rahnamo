"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Camera, Loader2 } from "lucide-react";
import type { NetworkProfile } from "@/lib/networkTypes";
import { useNetwork, useNetworkCopy, writeNetwork } from "./NetworkProvider";
import {
  Avatar,
  Busy,
  Confirm,
  ErrorBox,
  LoginPrompt,
  NetworkShell,
  useRemote,
} from "./NetworkUI";
import { uploadNetworkImage } from "./NetworkFeed";

type Draft = {
  name: string;
  headline: string;
  bio: string;
  location: string;
  skills: string;
  experience: string;
  education: string;
  website: string;
  image: string;
  published: boolean;
};
function Editor({ profile }: { profile: NetworkProfile }) {
  const { me, refresh } = useNetwork(),
    t = useNetworkCopy();
  const [draft, setDraft] = useState<Draft>({
      ...profile,
      skills: profile.skills.join(", "),
    }),
    [pending, setPending] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState<unknown>(null),
    [saved, setSaved] = useState(false),
    [confirm, setConfirm] = useState(false),
    [detailsOpen, setDetailsOpen] = useState(
      Boolean(profile.bio || profile.website || profile.experience || profile.education),
    ),
    flight = useRef(false);
  const basicsComplete =
    Number(Boolean(draft.headline.trim())) +
    Number(Boolean(draft.skills.split(",").some((skill) => skill.trim())));
  const blocks = useRemote<{ people: { id: string; name: string }[] }>(
    "blocks",
  );
  const set = (name: keyof Draft, value: string | boolean) => {
    setSaved(false);
    setDraft((p) => ({ ...p, [name]: value }));
  };
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (flight.current) return;
    flight.current = true;
    setPending(true);
    setSaved(false);
    setError(null);
    try {
      await writeNetwork("profile", {
        ...draft,
        skills: draft.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      await refresh();
      setSaved(true);
    } catch (failure) {
      setError(failure);
    } finally {
      flight.current = false;
      setPending(false);
    }
  }
  async function link() {
    if (flight.current) return;
    flight.current = true;
    setPending(true);
    setError(null);
    try {
      await writeNetwork("link-mentor", {});
      await refresh();
      setConfirm(false);
    } catch (failure) {
      setError(failure);
    } finally {
      flight.current = false;
      setPending(false);
    }
  }
  return (
    <>
      <form className="network-card network-form" onSubmit={save}>
        {!profile.published && (
          <section
            className="network-profile-onboarding"
            aria-labelledby="profile-basics-title"
          >
            <div>
              <h2 id="profile-basics-title">{t.profileBasics}</h2>
              <p>{t.profileBasicsHint}</p>
            </div>
            <div
              className="network-profile-progress"
              role="progressbar"
              aria-label={t.profileBasics}
              aria-valuemin={0}
              aria-valuemax={2}
              aria-valuenow={basicsComplete}
            >
              <span style={{ width: `${basicsComplete * 50}%` }} />
            </div>
            <div className="network-profile-checklist">
              <span className={draft.headline.trim() ? "complete" : ""}>
                {draft.headline.trim() ? "✓" : "1"} {t.headline}
              </span>
              <span
                className={
                  draft.skills.split(",").some((skill) => skill.trim())
                    ? "complete"
                    : ""
                }
              >
                {draft.skills.split(",").some((skill) => skill.trim()) ? "✓" : "2"} {t.skills}
              </span>
            </div>
          </section>
        )}
        <div className="network-form-photo">
          <Avatar
            person={{ name: draft.name, image: draft.image }}
            key={draft.image}
            size={72}
          />
          <label className="network-button secondary small">
            {uploading ? (
              <Loader2 size={16} className="network-spin" />
            ) : (
              <Camera size={16} />
            )}{" "}
            {t.photo}
            <input
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/webp"
              disabled={pending || uploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setUploading(true);
                setError(null);
                try {
                  set("image", await uploadNetworkImage(file));
                } catch (failure) {
                  setError(failure);
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
        </div>
        <div className="network-form-grid">
          <label className="network-field">
            {t.name}
            <input
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </label>
          <label className="network-field">
            {t.headline}
            <input
              required={draft.published}
              maxLength={160}
              value={draft.headline}
              onChange={(e) => set("headline", e.target.value)}
            />
          </label>
        </div>
        <label className="network-field">
          {t.location}
          <input
            maxLength={100}
            autoComplete="address-level2"
            value={draft.location}
            onChange={(e) => set("location", e.target.value)}
          />
        </label>
        <label className="network-field">
          {t.skills}
          <input
            required={draft.published}
            maxLength={490}
            value={draft.skills}
            onChange={(e) => set("skills", e.target.value)}
          />
          <small>{t.skillsHint}</small>
        </label>
        <details
          className="network-form-more"
          open={detailsOpen}
          onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
        >
          <summary>{t.moreProfileDetails}</summary>
          <p>{t.moreProfileDetailsHint}</p>
          <label className="network-field">
            {t.bio}
            <textarea
              rows={4}
              maxLength={2000}
              value={draft.bio}
              onChange={(e) => set("bio", e.target.value)}
            />
          </label>
          <label className="network-field">
            {t.website}
            <input
              type="url"
              maxLength={500}
              placeholder="https://"
              value={draft.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </label>
          <label className="network-field">
            {t.experience}
            <textarea
              rows={3}
              maxLength={2000}
              placeholder={t.experienceHint}
              value={draft.experience}
              onChange={(e) => set("experience", e.target.value)}
            />
          </label>
          <label className="network-field">
            {t.education}
            <textarea
              rows={2}
              maxLength={1000}
              placeholder={t.educationHint}
              value={draft.education}
              onChange={(e) => set("education", e.target.value)}
            />
          </label>
        </details>
        <label className="network-check">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) => set("published", e.target.checked)}
          />
          <span>
            {t.publicProfile}
            <small>{t.publicHint}</small>
          </span>
        </label>
        {Boolean(error) && <ErrorBox error={error} />}{" "}
        {saved && (
          <p className="network-success" role="status">
            {t.savedProfile}
          </p>
        )}
        <div className="network-form-actions">
          <Link className="network-text-link" href={"/people/" + profile.id}>
            {t.viewProfile}
          </Link>
          <button className="network-button" disabled={pending || uploading}>
            {pending && <Loader2 size={16} className="network-spin" />}
            {t.saveChanges}
          </button>
        </div>
      </form>
      {!profile.counselor_id && (
        <section className="network-card network-profile-section">
          <h2>{t.linkMentor}</h2>
          <p>{me.canLinkMentor ? t.linkHint : t.profileLinkHint}</p>
          <div style={{ marginTop: 16 }}>
            {me.canLinkMentor ? (
              <button
                className="network-button secondary"
                onClick={() => setConfirm(true)}
              >
                {t.linkMentor}
              </button>
            ) : (
              <Link className="network-text-link" href="/mentor/dashboard">
                {t.mentorLogin}
              </Link>
            )}
          </div>
        </section>
      )}
      <section className="network-card network-profile-section">
        <h2>{t.blocked}</h2>
        {blocks.loading ? (
          <Busy />
        ) : blocks.error ? (
          <ErrorBox error={blocks.error} retry={blocks.reload} />
        ) : blocks.data?.people.length ? (
          blocks.data.people.map((person) => (
            <div className="network-section-heading" key={person.id}>
              <span>{person.name}</span>
              <button
                className="network-button secondary small"
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  try {
                    await writeNetwork("blocks/" + person.id, {
                      blocked: false,
                    });
                    blocks.reload();
                  } catch (failure) {
                    setError(failure);
                  } finally {
                    setPending(false);
                  }
                }}
              >
                {t.unblock}
              </button>
            </div>
          ))
        ) : (
          <p>{t.noBlocks}</p>
        )}
      </section>
      {confirm && (
        <Confirm
          title={t.linkConfirm}
          pending={pending}
          onClose={() => setConfirm(false)}
          onConfirm={() => void link()}
        >
          {Boolean(error) && <ErrorBox error={error} />}
        </Confirm>
      )}
    </>
  );
}
export default function NetworkProfileEditor() {
  const { me, loading, error, refresh } = useNetwork(),
    t = useNetworkCopy();
  return (
    <NetworkShell>
      <header className="network-page-heading">
        <h1>{t.profileTitle}</h1>
        <p>{t.profileIntro}</p>
      </header>
      {loading ? (
        <Busy />
      ) : error ? (
        <ErrorBox error={error} retry={() => void refresh()} />
      ) : me.profile ? (
        <Editor key={me.profile.id} profile={me.profile} />
      ) : (
        <LoginPrompt />
      )}
    </NetworkShell>
  );
}
