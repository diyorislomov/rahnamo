"use client";
import { useState } from "react";
import Link from "next/link";
import {
  useNetwork,
  useNetworkCopy,
  writeNetwork,
} from "@/components/network/NetworkProvider";
import {
  Busy,
  Empty,
  ErrorBox,
  NetworkShell,
  useRemote,
} from "@/components/network/NetworkUI";
type Report = {
  id: string;
  reason: "spam" | "abuse" | "other";
  post_id: string;
  body: string;
  hidden: boolean;
  author: string;
  resolved_at: string | null;
};
export default function CommunityAdmin() {
  const { me, loading } = useNetwork(),
    t = useNetworkCopy(),
    reports = useRemote<{ reports: Report[] }>(
      me.admin ? "admin/reports" : null,
    );
  const [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(null);
  const act = async (id: string, hidden: boolean) => {
    setPending(true);
    setError(null);
    try {
      await writeNetwork("admin/posts/" + id, { hidden });
      reports.reload();
    } catch (failure) {
      setError(failure);
    } finally {
      setPending(false);
    }
  };
  return (
    <NetworkShell>
      <header className="network-page-heading">
        <h1>{t.reports}</h1>
      </header>
      {loading ? (
        <Busy />
      ) : !me.admin ? (
        <Link className="network-button" href="/admin">
          {t.login}
        </Link>
      ) : reports.loading ? (
        <Busy />
      ) : reports.error ? (
        <ErrorBox error={reports.error} retry={reports.reload} />
      ) : reports.data?.reports.length ? (
        reports.data.reports.map((report) => (
          <section
            className="network-card network-profile-section"
            key={report.id}
          >
            <div className="network-section-heading">
              <h2>{report.author}</h2>
              <span className="network-mentor">
                {report.resolved_at ? t.resolved : t[report.reason]}
              </span>
            </div>
            <p>{report.body}</p>
            <div className="network-profile-actions">
              <button
                className="network-button secondary small"
                disabled={pending}
                onClick={() => void act(report.post_id, !report.hidden)}
              >
                {report.hidden ? t.restore : t.hide}
              </button>
              {!report.resolved_at && !report.hidden && (
                <button
                  className="network-button quiet small"
                  disabled={pending}
                  onClick={() => void act(report.post_id, false)}
                >
                  {t.dismiss}
                </button>
              )}
            </div>
          </section>
        ))
      ) : (
        <Empty title={t.noReports} />
      )}{" "}
      {Boolean(error) && <ErrorBox error={error} />}
    </NetworkShell>
  );
}
