"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness, MailCheck, MailWarning, TriangleAlert } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { SummaryCard } from "@/components/ui/summary-card";
import { getAnalyticsSummary } from "@/services/dashboard";
import { formatCategory } from "@/utils/constants";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSummary() {
    setLoading(true);
    setError("");
    try {
      setSummary(await getAnalyticsSummary());
    } catch (caught) {
      setError(caught?.message || "Unable to load analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(loadSummary, 0);
    return () => clearTimeout(timeout);
  }, []);

  const statusRows = Object.entries(summary?.applicationsByStatus || {});
  const categoryRows = Object.entries(summary?.applicationsByCategory || {});

  return (
    <DashboardShell>
      <PageHeader title="Analytics" description="Authenticated totals derived from persisted application and email records." />
      {loading ? <LoadingState label="Loading analytics..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={loadSummary} /> : null}
      {!loading && !error && summary ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="Total Applications" value={summary.totalApplications} icon={BriefcaseBusiness} />
            <SummaryCard label="Emails Sent" value={summary.totalEmailsSent} icon={MailCheck} tone="blue" />
            <SummaryCard label="Sent Today" value={summary.emailsSentToday} icon={MailCheck} tone="emerald" />
            <SummaryCard label="Failed Jobs" value={summary.failedEmailJobs} icon={MailWarning} tone="rose" />
            <SummaryCard label="Uncertain Jobs" value={summary.uncertainEmailJobs} icon={TriangleAlert} tone="amber" />
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
              <h2 className="border-b border-zinc-800 px-5 py-4 font-medium text-zinc-100">Applications by status</h2>
              {statusRows.length ? (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-zinc-500"><tr><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Count</th></tr></thead>
                  <tbody className="divide-y divide-zinc-800">
                    {statusRows.map(([status, count]) => (
                      <tr key={status}><td className="px-5 py-3 capitalize text-zinc-300">{status}</td><td className="px-5 py-3 text-right font-medium text-zinc-100">{count}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="px-5 py-8 text-sm text-zinc-500">No applications available.</p>}
            </section>

            <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
              <h2 className="border-b border-zinc-800 px-5 py-4 font-medium text-zinc-100">Applications by category</h2>
              {categoryRows.length ? (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-zinc-500"><tr><th className="px-5 py-3">Category</th><th className="px-5 py-3 text-right">Count</th></tr></thead>
                  <tbody className="divide-y divide-zinc-800">
                    {categoryRows.map(([category, count]) => (
                      <tr key={category}><td className="px-5 py-3 text-zinc-300">{formatCategory(category)}</td><td className="px-5 py-3 text-right font-medium text-zinc-100">{count}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="px-5 py-8 text-sm text-zinc-500">No applications available.</p>}
            </section>
          </div>
        </>
      ) : null}
    </DashboardShell>
  );
}
