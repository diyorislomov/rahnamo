"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Search } from "lucide-react";
import type { NetworkProfile } from "@/lib/networkTypes";
import { networkApi, useNetworkCopy } from "./NetworkProvider";
import {
  Busy,
  Empty,
  ErrorBox,
  NetworkShell,
  PersonCard,
  useRemote,
} from "./NetworkUI";

type ActiveTrack = {
  slug: string;
  name_uz: string;
  name_ru: string | null;
  name_en: string;
  icon: string;
};

export default function NetworkPeople({
  mentors = false,
}: {
  mentors?: boolean;
}) {
  const t = useNetworkCopy(),
    locale = useLocale(),
    [query, setQuery] = useState(""),
    [skill, setSkill] = useState(""),
    [city, setCity] = useState(""),
    [maxPrice, setMaxPrice] = useState(""),
    [available, setAvailable] = useState(false),
    [applied, setApplied] = useState({
      query: "",
      skill: "",
      city: "",
      maxPrice: "",
      available: false,
    }),
    [page, setPage] = useState(0),
    [extra, setExtra] = useState<NetworkProfile[]>([]),
    [hasMore, setHasMore] = useState<boolean | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(null);
  const generation = useRef(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      generation.current++;
      setApplied({
        query: query.trim(),
        skill: mentors ? skill : "",
        city: mentors ? city.trim() : "",
        maxPrice: mentors ? maxPrice : "",
        available: mentors && available,
      });
      setPage(0);
      setExtra([]);
      setHasMore(null);
      setPending(false);
      setError(null);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, skill, city, maxPrice, available, mentors]);
  const params = new URLSearchParams({
    mentors: String(mentors),
    q: applied.query,
  });
  if (applied.skill) params.set("skill", applied.skill);
  if (applied.city) params.set("city", applied.city);
  if (applied.maxPrice) params.set("maxPrice", applied.maxPrice);
  if (applied.available) params.set("available", "true");
  const path = "people?" + params.toString(),
    result = useRemote<{ people: NetworkProfile[]; hasMore: boolean }>(path),
    tracks = useRemote<{ tracks: ActiveTrack[] }>("tracks");
  const trackLabels = Object.fromEntries(
    (tracks.data?.tracks || []).map((track) => [
      track.slug,
      locale === "ru"
        ? track.name_ru || track.name_en
        : locale === "en"
          ? track.name_en
          : track.name_uz,
    ]),
  );
  const refresh = () => {
    generation.current++;
    setPending(false);
    setExtra([]);
    setPage(0);
    setHasMore(null);
    result.reload();
  };
  const more = async () => {
    if (pending) return;
    const current = generation.current;
    setPending(true);
    setError(null);
    try {
      const next = await networkApi<{
        people: NetworkProfile[];
        hasMore: boolean;
      }>(path + "&page=" + (page + 1));
      if (current !== generation.current) return;
      setExtra((p) => [...p, ...next.people]);
      setHasMore(next.hasMore);
      setPage((p) => p + 1);
    } catch (failure) {
      if (current === generation.current) setError(failure);
    } finally {
      if (current === generation.current) setPending(false);
    }
  };
  return (
    <NetworkShell wide>
      <header className="network-page-heading">
        <h1>{mentors ? t.mentorsTitle : t.peopleTitle}</h1>
        <p>{mentors ? t.mentorsBody : t.peopleBody}</p>
      </header>
      <nav className="network-tabs" aria-label={t.people}>
        <Link
          href="/people"
          className={!mentors ? "active" : ""}
          aria-current={!mentors ? "page" : undefined}
        >
          {t.people}
        </Link>
        <Link
          href="/mentors"
          className={mentors ? "active" : ""}
          aria-current={mentors ? "page" : undefined}
        >
          {t.mentors}
        </Link>
      </nav>
      <label className="network-search">
        <Search size={19} />
        <span className="sr-only">{t.search}</span>
        <input
          type="search"
          maxLength={100}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
        />
      </label>
      {mentors && (
        <div className="network-filters">
          <label className="network-field">
            {t.filterSkill}
            <select value={skill} onChange={(e) => setSkill(e.target.value)}>
              <option value="">{t.allSkills}</option>
              {(tracks.data?.tracks || []).map((track) => (
                <option key={track.slug} value={track.slug}>
                  {track.icon} {locale === "ru"
                    ? track.name_ru || track.name_en
                    : locale === "en"
                      ? track.name_en
                      : track.name_uz}
                </option>
              ))}
            </select>
          </label>
          <label className="network-field">
            {t.filterCity}
            <input
              maxLength={100}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>
          <label className="network-field">
            {t.maxPrice}
            <input
              type="number"
              min={0}
              max={999_999_999}
              step={5000}
              inputMode="numeric"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </label>
          <label className="network-filter-check">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            <span>{t.hasAvailability}</span>
          </label>
          {(skill || city || maxPrice || available) && (
            <button
              type="button"
              className="network-text-link network-clear-filters"
              onClick={() => {
                setSkill("");
                setCity("");
                setMaxPrice("");
                setAvailable(false);
              }}
            >
              {t.clearFilters}
            </button>
          )}
        </div>
      )}
      {tracks.error ? (
        <ErrorBox error={tracks.error} retry={tracks.reload} />
      ) : null}
      {result.loading ? (
        <Busy />
      ) : result.error ? (
        <ErrorBox error={result.error} retry={result.reload} />
      ) : (
        <>
          <div className="network-people-grid">
            {[...(result.data?.people || []), ...extra].map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                onChange={refresh}
                trackLabels={trackLabels}
              />
            ))}
          </div>
          {result.data && !result.data.people.length && !extra.length && (
            <div className="network-card">
              <Empty title={t.noResults} description={t.noResultsBody} />
            </div>
          )}
          {(hasMore ?? result.data?.hasMore) && (
            <button
              className="network-button secondary"
              disabled={pending}
              onClick={more}
            >
              {pending ? t.loading : t.more}
            </button>
          )}
        </>
      )}
      {Boolean(error) && <ErrorBox error={error} />}
    </NetworkShell>
  );
}
