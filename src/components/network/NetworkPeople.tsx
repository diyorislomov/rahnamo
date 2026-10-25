"use client";
import { useEffect, useRef, useState } from "react";
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

export default function NetworkPeople({
  mentors = false,
}: {
  mentors?: boolean;
}) {
  const t = useNetworkCopy(),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [extra, setExtra] = useState<NetworkProfile[]>([]),
    [hasMore, setHasMore] = useState<boolean | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(null);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(0);
      setExtra([]);
      setHasMore(null);
      setPending(false);
      setError(null);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  const path = "people?mentors=" + mentors + "&q=" + encodeURIComponent(search),
    result = useRemote<{ people: NetworkProfile[]; hasMore: boolean }>(path);
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
      {result.loading ? (
        <Busy />
      ) : result.error ? (
        <ErrorBox error={result.error} retry={result.reload} />
      ) : (
        <>
          <div className="network-people-grid">
            {[...(result.data?.people || []), ...extra].map((person) => (
              <PersonCard key={person.id} person={person} onChange={refresh} />
            ))}
          </div>
          {!result.data?.people.length && (
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
