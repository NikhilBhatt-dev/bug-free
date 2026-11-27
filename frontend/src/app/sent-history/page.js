"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Search } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { getSentEmail, listSentEmails } from "@/services/sent-emails";
import { formatCategory, JOB_CATEGORIES } from "@/utils/constants";

const inputClass = "h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-400";

export default function SentHistoryPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listSentEmails({
        page,
        limit: 20,
        search: search || undefined,
        category: category || undefined,
        sortBy: "sentAt",
        sortOrder,
      });
      setItems(data.items || []);
      setPagination(data.pagination);
    } catch (caught) {
      setError(caught?.message || "Unable to load sent email history");
    } finally {
      setLoading(false);
    }
  }, [category, page, search, sortOrder]);

  useEffect(() => {
    const timeout = setTimeout(loadHistory, 250);
    return () => clearTimeout(timeout);
  }, [loadHistory]);

  async function openDetails(sentEmail) {
    setDetailLoading(true);
    try {
      setDetail(await getSentEmail(sentEmail._id));
    } catch (caught) {
      setError(caught?.message || "Unable to load sent email details");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Sent History"
        description="Review immutable snapshots of emails accepted by Gmail."
      />

      <section className="mb-4 grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 md:grid-cols-[minmax(220px,1fr)_180px_150px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search company, recipient or subject"
            className={`${inputClass} pl-9`}
          />
        </div>
        <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className={inputClass}>
          <option value="">All categories</option>
          {JOB_CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select value={sortOrder} onChange={(event) => { setSortOrder(event.target.value); setPage(1); }} className={inputClass}>
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </section>

      {loading ? <LoadingState label="Loading sent emails..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={loadHistory} /> : null}
      {!loading && !error && !items.length ? (
        <EmptyState title="No sent emails" description="Successful Gmail sends will appear here." />
      ) : null}

      {!loading && !error && items.length ? (
        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-zinc-900/50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Sent</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {items.map((sentEmail) => (
                  <tr key={sentEmail._id}>
                    <td className="px-4 py-3 font-medium text-zinc-200">{sentEmail.companyName || "-"}</td>
                    <td className="px-4 py-3 text-zinc-400">{sentEmail.recipient}</td>
                    <td className="max-w-[280px] truncate px-4 py-3 text-zinc-400">{sentEmail.subject}</td>
                    <td className="px-4 py-3 text-zinc-400">{formatCategory(sentEmail.category)}</td>
                    <td className="px-4 py-3 text-zinc-500">{sentEmail.sentAt ? new Date(sentEmail.sentAt).toLocaleString() : "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" aria-label="View sent email" onClick={() => openDetails(sentEmail)} className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
                        <Eye className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-sm text-zinc-500">
            <span>{pagination.total} sent emails</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-md border border-zinc-800 px-3 py-1.5 disabled:opacity-40">Previous</button>
              <span className="px-2 py-1.5">Page {pagination.page} of {pagination.totalPages}</span>
              <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-md border border-zinc-800 px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          </div>
        </section>
      ) : null}

      <Modal open={Boolean(detail) || detailLoading} onClose={() => setDetail(null)} title="Sent email details" size="max-w-3xl">
        {detailLoading ? <LoadingState label="Loading details..." /> : null}
        {detail ? (
          <div className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div><dt className="text-xs uppercase text-zinc-500">Recipient</dt><dd className="mt-1 text-sm text-zinc-200">{detail.recipient}</dd></div>
              <div><dt className="text-xs uppercase text-zinc-500">Sent timestamp</dt><dd className="mt-1 text-sm text-zinc-200">{detail.sentAt ? new Date(detail.sentAt).toLocaleString() : "-"}</dd></div>
              <div><dt className="text-xs uppercase text-zinc-500">Company</dt><dd className="mt-1 text-sm text-zinc-200">{detail.companyName || "-"}</dd></div>
              <div><dt className="text-xs uppercase text-zinc-500">Category</dt><dd className="mt-1 text-sm text-zinc-200">{formatCategory(detail.category)}</dd></div>
              <div><dt className="text-xs uppercase text-zinc-500">Gmail Message ID</dt><dd className="mt-1 break-all text-sm text-zinc-200">{detail.gmailMessageId || "-"}</dd></div>
              <div><dt className="text-xs uppercase text-zinc-500">Gmail Thread ID</dt><dd className="mt-1 break-all text-sm text-zinc-200">{detail.gmailThreadId || "-"}</dd></div>
              <div><dt className="text-xs uppercase text-zinc-500">CV attachment</dt><dd className="mt-1 text-sm text-zinc-200">{detail.cvReference?.originalFileName || "-"}</dd></div>
              <div><dt className="text-xs uppercase text-zinc-500">Batch ID</dt><dd className="mt-1 break-all text-sm text-zinc-200">{detail.batchId || "-"}</dd></div>
            </dl>
            <div>
              <p className="text-xs uppercase text-zinc-500">Subject</p>
              <p className="mt-1 text-sm text-zinc-200">{detail.subject}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-zinc-500">Exact sent body</p>
              <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-300">{detail.body}</pre>
            </div>
          </div>
        ) : null}
      </Modal>
    </DashboardShell>
  );
}
