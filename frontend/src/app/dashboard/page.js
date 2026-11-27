"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BriefcaseBusiness, CheckCircle2, Send, UserRoundSearch, XCircle } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SummaryCard } from "@/components/ui/summary-card";
import { listApplications } from "@/services/applications";
import { getGmailStatus } from "@/services/dashboard";

export default function DashboardPage() {
  const [applications, setApplications] = useState([]);
  const [gmailStatus, setGmailStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const [applicationData, gmailConnection] = await Promise.allSettled([
        listApplications({ page: 1, limit: 100, sortBy: "applicationDate", sortOrder: "desc" }),
        getGmailStatus(),
      ]);
      if (applicationData.status === "rejected") throw applicationData.reason;
      setApplications(applicationData.value.items || []);
      setGmailStatus(
        gmailConnection.status === "fulfilled"
          ? gmailConnection.value
          : { connected: false },
      );
    } catch (caught) {
      setError(caught?.message || "Unable to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(loadDashboard, 0);
    return () => clearTimeout(timeout);
  }, []);

  const counts = {
    total: applications.length,
    applied: applications.filter((item) => item.status === "applied").length,
    interview: applications.filter((item) => item.status === "interviewing").length,
    rejected: applications.filter((item) => item.status === "rejected").length,
    selected: applications.filter((item) => item.status === "offer").length,
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Dashboard"
        description="A concise view of your application activity."
        action={
          <Link
            href="/applications"
            className="inline-flex rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-emerald-300"
          >
            Manage applications
          </Link>
        }
      />

      {loading ? <LoadingState label="Loading dashboard..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={loadDashboard} /> : null}

      {!loading && !error ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="Total Applications" value={counts.total} icon={BriefcaseBusiness} />
            <SummaryCard label="Applied" value={counts.applied} icon={Send} tone="blue" />
            <SummaryCard label="Interview" value={counts.interview} icon={UserRoundSearch} tone="violet" />
            <SummaryCard label="Rejected" value={counts.rejected} icon={XCircle} tone="rose" />
            <SummaryCard label="Selected" value={counts.selected} icon={CheckCircle2} tone="amber" />
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
              <div className="border-b border-zinc-800 px-5 py-4">
                <h2 className="font-medium text-zinc-100">Recent applications</h2>
              </div>
              {applications.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-zinc-900/50 text-xs uppercase text-zinc-500">
                      <tr>
                        <th className="px-5 py-3">Company</th>
                        <th className="px-5 py-3">Role</th>
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {applications.slice(0, 8).map((application) => (
                        <tr key={application._id}>
                          <td className="px-5 py-3 font-medium text-zinc-200">{application.companyName}</td>
                          <td className="px-5 py-3 text-zinc-400">{application.jobRole}</td>
                          <td className="px-5 py-3 text-zinc-400">{application.category}</td>
                          <td className="px-5 py-3"><StatusBadge status={application.status} /></td>
                          <td className="px-5 py-3 text-zinc-500">
                            {application.applicationDate
                              ? new Date(application.applicationDate).toLocaleDateString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5">
                  <EmptyState
                    title="No applications yet"
                    description="Add your first opportunity to start tracking your search."
                    action={
                      <Link href="/applications" className="text-sm font-medium text-emerald-300">
                        Add application
                      </Link>
                    }
                  />
                </div>
              )}
            </section>

            <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <h2 className="font-medium text-zinc-100">Gmail connection</h2>
              <div className="mt-4 flex items-center gap-3">
                <span className={`size-2.5 rounded-full ${gmailStatus?.connected ? "bg-emerald-400" : "bg-zinc-600"}`} />
                <span className="text-sm text-zinc-300">
                  {gmailStatus?.connected ? "Connected" : "Not connected"}
                </span>
              </div>
              <Link
                href="/gmail"
                className="mt-5 inline-flex text-sm font-medium text-emerald-300 hover:text-emerald-200"
              >
                Open Gmail integration
              </Link>
            </section>
          </div>
        </>
      ) : null}
    </DashboardShell>
  );
}
