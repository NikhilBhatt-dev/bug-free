"use client";

import { useEffect, useState } from "react";
import { Eye, LoaderCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { listApplications } from "@/services/applications";
import { listCvs } from "@/services/cvs";
import { listTemplates } from "@/services/templates";
import { cancelEmailBatch, createEmailBatch, listEmailBatches, previewEmail } from "@/services/email";
import { confirmEmail } from "@/services/email";
import { formatCategory } from "@/utils/constants";

const inputClass = "h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-400";

function toSnapshot(preview) {
  return {
    applicationId: preview.applicationId,
    recipient: preview.recipient,
    subject: preview.subject,
    body: preview.body,
    companyName: preview.companyName,
    jobRole: preview.jobRole,
    hrName: preview.hrName,
    category: preview.category,
    templateId: preview.templateId,
    cvReference: preview.cvReference,
  };
}

export default function EmailComposerPage() {
  const [tab, setTab] = useState("create");
  const [applications, setApplications] = useState([]);
  const [cvs, setCvs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [previewErrors, setPreviewErrors] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batches, setBatches] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);

  async function loadCreateData() {
    setLoading(true);
    setError("");
    try {
      const [applicationData, cvData, templateData] = await Promise.all([
        listApplications({ page: 1, limit: 100, sortBy: "applicationDate", sortOrder: "desc" }),
        listCvs(),
        listTemplates(),
      ]);
      setApplications(applicationData.items || []);
      setCvs(cvData || []);
      setTemplates(templateData || []);
    } catch (caught) {
      setError(caught?.message || "Unable to load campaign data");
    } finally {
      setLoading(false);
    }
  }

  async function loadBatches() {
    setBatchLoading(true);
    setBatchError("");
    try {
      const data = await listEmailBatches({ page: 1, limit: 20 });
      setBatches(data.items || []);
    } catch (caught) {
      setBatchError(caught?.message || "Unable to load email batches");
    } finally {
      setBatchLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (tab === "create") loadCreateData();
      else loadBatches();
    }, 0);
    return () => clearTimeout(timeout);
  }, [tab]);

  const filteredApplications = applications.filter((application) => {
    const term = search.toLowerCase();
    return !term ||
      application.companyName?.toLowerCase().includes(term) ||
      application.jobRole?.toLowerCase().includes(term) ||
      application.hrEmail?.toLowerCase().includes(term);
  });

  function toggleApplication(applicationId) {
    setSelectedIds((current) =>
      current.includes(applicationId)
        ? current.filter((id) => id !== applicationId)
        : current.length < 10
          ? [...current, applicationId]
          : current,
    );
  }

  async function generatePreviews() {
    if (!selectedIds.length) {
      toast.error("Select at least one application");
      return;
    }
    setPreviewLoading(true);
    setPreviews([]);
    setPreviewErrors([]);
    const nextPreviews = [];
    const nextErrors = [];
    for (const applicationId of selectedIds) {
      const application = applications.find((item) => item._id === applicationId);
      const matchingCv = cvs.find((cv) => cv.category === application?.category);
      if (!matchingCv) {
        nextErrors.push({
          applicationId,
          companyName: application?.companyName,
          message: `Upload a CV for the ${formatCategory(application?.category)} category before sending.`,
        });
        continue;
      }
      try {
        const preview = await previewEmail({
          applicationId,
          recipient: application.hrEmail,
          hrName: application.hrName || "Hiring Team",
        });
        nextPreviews.push(preview);
      } catch (caught) {
        nextErrors.push({
          applicationId,
          companyName: application?.companyName,
          message: caught?.message || "Unable to generate this email preview",
        });
      }
    }
    setPreviews(nextPreviews);
    setPreviewErrors(nextErrors);
    setPreviewLoading(false);
    setPreviewOpen(true);
  }

  async function confirmAndCreateBatch() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const confirmedItems = [];
      for (const preview of previews) {
        const snapshot = toSnapshot(preview);
        const confirmed = await confirmEmail({
          snapshot,
          confirmationToken: preview.confirmationToken,
        });
        void confirmed;
        confirmedItems.push({
          snapshot,
          confirmationToken: preview.confirmationToken,
        });
      }
      if (!confirmedItems.length) throw new Error("No confirmed emails are ready");
      const idempotencyKey = crypto.randomUUID();
      await createEmailBatch({
        idempotencyKey,
        items: confirmedItems,
      });
      toast.success("Confirmed batch created");
      setConfirmOpen(false);
      setPreviewOpen(false);
      setSelectedIds([]);
      setPreviews([]);
      setTab("batches");
      await loadBatches();
    } catch (caught) {
      toast.error(caught?.message || "Unable to create email batch");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelBatch() {
    if (!cancelTarget) return;
    try {
      await cancelEmailBatch(cancelTarget._id);
      toast.success("Pending jobs cancelled");
      setCancelTarget(null);
      await loadBatches();
    } catch (caught) {
      toast.error(caught?.message || "Unable to cancel batch");
    }
  }

  return (
    <DashboardShell>
      <PageHeader title="Email Campaigns" description="Preview and confirm application emails before batch sending." />

      <div className="mb-5 flex gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
        {[
          ["create", "Create campaign"],
          ["batches", "Batches"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-md px-4 py-2 text-sm ${tab === value ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "create" ? (
        <>
          {loading ? <LoadingState label="Loading campaign data..." /> : null}
          {!loading && error ? <ErrorState message={error} onRetry={loadCreateData} /> : null}
          {!loading && !error ? (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search applications"
                  className={`${inputClass} max-w-md`}
                />
                <button
                  type="button"
                  disabled={previewLoading || !selectedIds.length}
                  onClick={generatePreviews}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 text-sm font-medium text-zinc-950 disabled:opacity-50"
                >
                  {previewLoading ? <LoaderCircle className="size-4 animate-spin" /> : <Eye className="size-4" />}
                  Preview {selectedIds.length ? `${selectedIds.length} recipient${selectedIds.length === 1 ? "" : "s"}` : "recipients"}
                </button>
              </div>

              {filteredApplications.length ? (
                <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-zinc-900/50 text-xs uppercase text-zinc-500">
                        <tr>
                          <th className="px-4 py-3">Select</th>
                          <th className="px-4 py-3">Company</th>
                          <th className="px-4 py-3">Job Role</th>
                          <th className="px-4 py-3">HR Email</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {filteredApplications.map((application) => {
                          const matchingCv = cvs.some((cv) => cv.category === application.category);
                          return (
                            <tr key={application._id} className="hover:bg-zinc-900/40">
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(application._id)}
                                  onChange={() => toggleApplication(application._id)}
                                  className="size-4 accent-emerald-400"
                                />
                              </td>
                              <td className="px-4 py-3 font-medium text-zinc-200">{application.companyName}</td>
                              <td className="px-4 py-3 text-zinc-400">{application.jobRole}</td>
                              <td className="px-4 py-3 text-zinc-400">{application.hrEmail}</td>
                              <td className="px-4 py-3 text-zinc-400">
                                {formatCategory(application.category)}
                                {!matchingCv ? <span className="ml-2 text-xs text-rose-400">CV missing</span> : null}
                              </td>
                              <td className="px-4 py-3"><StatusBadge status={application.status} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : (
                <EmptyState title="No applications found" description="Add applications before creating a campaign." />
              )}
            </>
          ) : null}
        </>
      ) : (
        <>
          {batchLoading ? <LoadingState label="Loading batches..." /> : null}
          {!batchLoading && batchError ? <ErrorState message={batchError} onRetry={loadBatches} /> : null}
          {!batchLoading && !batchError && !batches.length ? (
            <EmptyState title="No email batches" description="Confirmed campaigns will appear here." />
          ) : null}
          {!batchLoading && !batchError && batches.length ? (
            <section className="grid gap-4">
              {batches.map((batch) => (
                <article key={batch._id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium capitalize text-zinc-100">{batch.status}</p>
                      <p className="mt-1 text-xs text-zinc-500">Created {new Date(batch.createdAt).toLocaleString()}</p>
                    </div>
                    {["pending", "paused"].includes(batch.status) ? (
                      <button type="button" onClick={() => setCancelTarget(batch)} className="rounded-lg border border-rose-900/60 px-3 py-2 text-sm text-rose-300">Cancel batch</button>
                    ) : null}
                  </div>
                  {batch.pauseReason ? (
                    <p className="mt-3 rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-300">{batch.pauseReason}</p>
                  ) : null}
                  <div className="mt-4 grid gap-2">
                    {(batch.items || []).map((item, index) => (
                      <div key={item.itemIdempotencyKey || index} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 px-3 py-2.5">
                        <div>
                          <p className="text-sm text-zinc-200">{item.companyName || "Application"}</p>
                          <p className="text-xs text-zinc-500">{item.recipient}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-medium capitalize text-zinc-300">{item.status}</span>
                          {item.status === "uncertain" ? <p className="mt-1 max-w-xs text-xs text-amber-300">Outcome uncertain. Verify Gmail before retrying.</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          ) : null}
        </>
      )}

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Email preview" description="Review every recipient before final confirmation." size="max-w-4xl">
        {previewErrors.length ? (
          <div className="mb-4 space-y-2">
            {previewErrors.map((errorItem) => (
              <div key={errorItem.applicationId} className="rounded-lg border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-300">
                {errorItem.companyName}: {errorItem.message}
              </div>
            ))}
          </div>
        ) : null}
        {previews.length ? (
          <div className="space-y-4">
            {previews.map((preview) => (
              <article key={preview.applicationId} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-100">{preview.companyName}</p>
                    <p className="mt-1 text-sm text-zinc-400">{preview.recipient}</p>
                  </div>
                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">{formatCategory(preview.category)}</span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-zinc-500">Subject</dt><dd className="mt-1 text-zinc-200">{preview.subject}</dd></div>
                  <div><dt className="text-xs text-zinc-500">Attachment</dt><dd className="mt-1 text-zinc-200">{preview.selectedCv?.originalFileName}</dd></div>
                </dl>
                <div className="mt-4 whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-300">{preview.body}</div>
              </article>
            ))}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300">Close</button>
              <button type="button" onClick={() => setConfirmOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950">
                <Send className="size-4" /> Confirm and create batch
              </button>
            </div>
          </div>
        ) : (
          <EmptyState title="No valid previews" description="Fix the missing CV or template issues above and try again." />
        )}
      </Modal>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm final batch" description="This locks the displayed recipient, subject, body, and category CV selection.">
        <p className="text-sm leading-6 text-zinc-400">
          Create one batch with {previews.length} confirmed recipient{previews.length === 1 ? "" : "s"}? The backend will enforce the 10-recipient and 20-email daily limits.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300">Go back</button>
          <button type="button" disabled={submitting} onClick={confirmAndCreateBatch} className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-60">
            {submitting ? "Creating batch..." : "Confirm and create batch"}
          </button>
        </div>
      </Modal>

      <Modal open={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} title="Cancel pending jobs">
        <p className="text-sm leading-6 text-zinc-400">Cancel this batch and any jobs still pending? Sent or uncertain jobs are not automatically changed.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setCancelTarget(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300">Keep batch</button>
          <button type="button" onClick={handleCancelBatch} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white">Cancel batch</button>
        </div>
      </Modal>
    </DashboardShell>
  );
}
