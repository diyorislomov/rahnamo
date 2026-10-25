"use client";
import Link from "next/link";
import { useState } from "react";
import { useLocale } from "next-intl";
import type { NetworkNotification } from "@/lib/networkTypes";
import { useNetwork, useNetworkCopy, writeNetwork } from "./NetworkProvider";
import {
  Avatar,
  Busy,
  Empty,
  ErrorBox,
  LoginPrompt,
  NetworkShell,
  useRemote,
} from "./NetworkUI";
export default function NetworkNotifications() {
  const { me, loading, refresh } = useNetwork(),
    t = useNetworkCopy(),
    locale = useLocale();
  const result = useRemote<{ notifications: NetworkNotification[] }>(
      me.profile ? "notifications" : null,
    ),
    [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function read() {
    setPending(true);
    setError(null);
    try {
      await writeNetwork("notifications/read", {});
      await refresh();
      result.reload();
    } catch (failure) {
      setError(failure);
    } finally {
      setPending(false);
    }
  }
  return (
    <NetworkShell>
      <header className="network-page-heading">
        <h1>{t.notifications}</h1>
        <p>{t.notificationTitle}</p>
      </header>
      {loading ? (
        <Busy />
      ) : !me.profile ? (
        <LoginPrompt />
      ) : result.loading ? (
        <Busy />
      ) : result.error ? (
        <ErrorBox error={result.error} retry={result.reload} />
      ) : (
        <>
          {!!result.data?.notifications.some((n) => !n.read_at) && (
            <button
              className="network-text-link"
              onClick={read}
              disabled={pending}
            >
              {t.readAll}
            </button>
          )}
          {Boolean(error) && <ErrorBox error={error} />}
          <section className="network-card">
            {result.data?.notifications.length ? (
              result.data.notifications.map((n) => (
                <Link
                  key={n.id}
                  className={
                    "network-notification" + (!n.read_at ? " unread" : "")
                  }
                  href={
                    n.post_id ? "/?post=" + n.post_id : "/people/" + n.actor.id
                  }
                >
                  <Avatar person={n.actor} />
                  <div>
                    <p>
                      <strong>{n.actor.name}</strong>{" "}
                      {n.kind === "follow" ? t.followNotice : t.commentNotice}
                    </p>
                    <time dateTime={n.created_at}>
                      {new Date(n.created_at).toLocaleDateString(locale, {
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                </Link>
              ))
            ) : (
              <Empty
                title={t.noNotifications}
                description={t.noNotificationsBody}
              />
            )}
          </section>
        </>
      )}
    </NetworkShell>
  );
}
