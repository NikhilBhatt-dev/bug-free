"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { FormField } from "@/components/ui/form-field";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  createApplication,
  deleteApplication,
  listApplications,
  updateApplication,
} from "@/services/applications";
import { APPLICATION_STATUSES, JOB_CATEGORIES } from "@/utils/constants";

const emptyForm = {
  companyName: "",
  jobRole: "",
  hrEmail: "",
  hrName: "",
  category: "technology",
  applicationDate: new Date().toISOString().slice(0, 10),
  status: "saved",
  sourceUrl: "",
  notes: "",
};

function getErrorMessage(error, fallback) {
  return error?.message || error?.error?.details?.[0]?.msg || fallback;
}

export default function ApplicationsPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("applicationDate");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listApplications({
        page,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
        category: category || undefined,
        sortBy,
        sortOrder,
      });
      setItems(data.items || []);
      setPagination(data.pagination);
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to load applications"));
    } finally {
      setLoading(false);
    }
  }, [category, page, search, sortBy, sortOrder, status]);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
    setFormOpen(true);
  }

  function openEdit(application) {
    setEditingId(application._id);
    setForm({
      companyName: application.companyName || "",
      jobRole: application.jobRole || "",
      hrEmail: application.hrEmail || "",
      hrName: application.hrName || "",
      category: application.category || "technology",
      applicationDate: application.applicationDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      status: application.status || "saved",
      sourceUrl: application.sourceUrl || "",
      notes: application.notes || "",
    });
    setFormErrors({});
    setFormOpen(true);
  }

  function validateForm() {
    const errors = {};
    if (!form.companyName.trim()) errors.companyName = "Company name is required";
    if (!form.jobRole.trim()) errors.jobRole = "Job role is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.hrEmail)) errors.hrEmail = "Enter a valid HR email";
    if (!form.category) errors.category = "Category is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        hrName: form.hrName || null,
      };
      if (!form.sourceUrl?.trim()) delete payload.sourceUrl;
      if (editingId) {
        await updateApplication(editingId, payload);
        toast.success("Application updated");
      } else {
        await createApplication(payload);
        toast.success("Application created");
      }
      setFormOpen(false);
      setPage(1);
      await load();
    } catch (caught) {
      toast.error(getErrorMessage(caught, "Unable to save application"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteApplication(deleteTarget._id);
      toast.success("Application permanently deleted");
      setDeleteTarget(null);
      await load();
    } catch (caught) {
      toast.error(getErrorMessage(caught, "Unable to delete application"));
    }
  }

  function changeSort(field) {
    if (sortBy === field) setSortOrder((value) => (value === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortOrder("asc");
    }
  }

  const inputClass = "h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-400";

  return (
    <DashboardShell>
      <PageHeader
        title="Applications"
        description="Track opportunities and manage every application status."
        action={
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-emerald-300">
            <Plus className="size-4" /> New application
          </button>
        }
      />

      <section className="mb-4 grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 md:grid-cols-[minmax(220px,1fr)_180px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search company, role or HR email"
            className={`${inputClass} pl-9`}
          />
        </div>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={inputClass}>
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className={inputClass}>
          <option value="">All categories</option>
          {JOB_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </section>

      {loading ? <LoadingState label="Loading applications..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={load} /> : null}
      {!loading && !error && !items.length ? (
        <EmptyState title="No applications found" description="Create an application or adjust your filters." action={<button type="button" onClick={openCreate} className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950">Create application</button>} />
      ) : null}

      {!loading && !error && items.length ? (
        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-zinc-900/50 text-xs uppercase text-zinc-500">
                <tr>
                  {[
                    ["companyName", "Company"],
                    ["jobRole", "Job Role"],
                    ["category", "Category"],
                    ["applicationDate", "Date"],
                    ["status", "Status"],
                  ].map(([field, label]) => (
                    <th key={field} className="px-4 py-3">
                      <button type="button" onClick={() => changeSort(field)} className="uppercase hover:text-zinc-300">
                        {label} {sortBy === field ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3">HR Email</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {items.map((application) => (
                  <tr key={application._id} className="hover:bg-zinc-900/40">
                    <td className="px-4 py-3 font-medium text-zinc-200">{application.companyName}</td>
                    <td className="px-4 py-3 text-zinc-400">{application.jobRole}</td>
                    <td className="px-4 py-3 text-zinc-400">{application.category}</td>
                    <td className="px-4 py-3 text-zinc-400">{application.applicationDate ? new Date(application.applicationDate).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3"><StatusBadge status={application.status} /></td>
                    <td className="px-4 py-3 text-zinc-400">{application.hrEmail}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button type="button" aria-label="View application" onClick={() => setDetail(application)} className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><Eye className="size-4" /></button>
                        <button type="button" aria-label="Edit application" onClick={() => openEdit(application)} className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><Pencil className="size-4" /></button>
                        <button type="button" aria-label="Delete application" onClick={() => setDeleteTarget(application)} className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-rose-950 hover:text-rose-300"><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-sm text-zinc-500">
            <span>{pagination.total} applications</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-md border border-zinc-800 px-3 py-1.5 disabled:opacity-40">Previous</button>
              <span className="px-2 py-1.5">Page {pagination.page} of {pagination.totalPages}</span>
              <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-md border border-zinc-800 px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          </div>
        </section>
      ) : null}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingId ? "Edit application" : "New application"} description="Application details are private to your account." size="max-w-2xl">
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Company" htmlFor="companyName" error={formErrors.companyName}>
            <input id="companyName" value={form.companyName} onChange={(event) => setForm({ ...form, companyName: event.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Job role" htmlFor="jobRole" error={formErrors.jobRole}>
            <input id="jobRole" value={form.jobRole} onChange={(event) => setForm({ ...form, jobRole: event.target.value })} className={inputClass} />
          </FormField>
          <FormField label="HR email" htmlFor="hrEmail" error={formErrors.hrEmail}>
            <input id="hrEmail" type="email" value={form.hrEmail} onChange={(event) => setForm({ ...form, hrEmail: event.target.value })} className={inputClass} />
          </FormField>
          <FormField label="HR name" htmlFor="hrName">
            <input id="hrName" value={form.hrName} onChange={(event) => setForm({ ...form, hrName: event.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Category" htmlFor="category" error={formErrors.category}>
            <select id="category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className={inputClass}>
              {JOB_CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </FormField>
          <FormField label="Status" htmlFor="status">
            <select id="status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className={inputClass}>
              {APPLICATION_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </FormField>
          <FormField label="Application date" htmlFor="applicationDate">
            <input id="applicationDate" type="date" value={form.applicationDate} onChange={(event) => setForm({ ...form, applicationDate: event.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Source URL" htmlFor="sourceUrl">
            <input id="sourceUrl" type="url" value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} className={inputClass} />
          </FormField>
          <FormField label="Notes" htmlFor="notes" className="sm:col-span-2">
            <textarea id="notes" rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400" />
          </FormField>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-60">{saving ? "Saving..." : "Save application"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.companyName || "Application details"}>
        {detail ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ["Job Role", detail.jobRole],
              ["HR Email", detail.hrEmail],
              ["HR Name", detail.hrName || "-"],
              ["Category", detail.category],
              ["Status", detail.status],
              ["Application Date", detail.applicationDate ? new Date(detail.applicationDate).toLocaleDateString() : "-"],
              ["Source", detail.sourceUrl || "-"],
              ["Notes", detail.notes || "-"],
            ].map(([label, value]) => (
              <div key={label}><dt className="text-xs uppercase text-zinc-500">{label}</dt><dd className="mt-1 break-words text-sm text-zinc-200">{value}</dd></div>
            ))}
          </dl>
        ) : null}
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete application permanently">
        <p className="text-sm leading-6 text-zinc-400">
          Delete <strong className="text-zinc-200">{deleteTarget?.companyName}</strong>? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300">Cancel</button>
          <button type="button" onClick={handleDelete} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-400">Delete permanently</button>
        </div>
      </Modal>
    </DashboardShell>
  );
}
