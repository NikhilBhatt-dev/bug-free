"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { FormField } from "@/components/ui/form-field";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { createTemplate, deleteTemplate, listTemplates, updateTemplate } from "@/services/templates";
import { formatCategory, JOB_CATEGORIES } from "@/utils/constants";

const emptyTemplate = {
  category: "technology",
  subject: "",
  body: "",
  isActive: true,
};

const inputClass = "h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-400";

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyTemplate);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function loadTemplates() {
    setLoading(true);
    setError("");
    try {
      setTemplates(await listTemplates());
    } catch (caught) {
      setError(caught?.message || "Unable to load email templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(loadTemplates, 0);
    return () => clearTimeout(timeout);
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyTemplate);
    setFormErrors({});
    setFormOpen(true);
  }

  function openEdit(template) {
    setEditing(template);
    setForm({
      category: template.category,
      subject: template.subject,
      body: template.body,
      isActive: template.isActive !== false,
    });
    setFormErrors({});
    setFormOpen(true);
  }

  function validate() {
    const errors = {};
    if (!form.category) errors.category = "Category is required";
    if (!form.subject.trim()) errors.subject = "Subject is required";
    if (!form.body.trim()) errors.body = "Email body is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) await updateTemplate(editing._id, form);
      else await createTemplate(form);
      toast.success(editing ? "Template updated" : "Template created");
      setFormOpen(false);
      await loadTemplates();
    } catch (caught) {
      toast.error(caught?.message || "Unable to save template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteTemplate(deleteTarget._id);
      toast.success("Template deleted");
      setDeleteTarget(null);
      await loadTemplates();
    } catch (caught) {
      toast.error(caught?.message || "Unable to delete template");
    }
  }

  const filtered = categoryFilter
    ? templates.filter((template) => template.category === categoryFilter)
    : templates;

  return (
    <DashboardShell>
      <PageHeader
        title="Email Templates"
        description="Create reusable, category-specific email templates."
        action={
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-emerald-300">
            <Plus className="size-4" /> New template
          </button>
        }
      />

      <section className="mb-4 flex items-center gap-3">
        <label htmlFor="template-category-filter" className="text-sm text-zinc-400">Category</label>
        <select
          id="template-category-filter"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className={`${inputClass} max-w-56`}
        >
          <option value="">All categories</option>
          {JOB_CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </section>

      {loading ? <LoadingState label="Loading templates..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={loadTemplates} /> : null}
      {!loading && !error && !filtered.length ? (
        <EmptyState
          title="No email templates found"
          description="Create a template or change the category filter."
          action={<button type="button" onClick={openCreate} className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950">Create template</button>}
        />
      ) : null}

      {!loading && !error && filtered.length ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {filtered.map((template) => (
            <article key={template._id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400">
                    {formatCategory(template.category)}
                  </span>
                  <h2 className="mt-3 line-clamp-1 font-medium text-zinc-100">{template.subject}</h2>
                </div>
                <div className="flex gap-1">
                  <button type="button" aria-label="Edit template" onClick={() => openEdit(template)} className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" aria-label="Delete template" onClick={() => setDeleteTarget(template)} className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-rose-950 hover:text-rose-300">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <p className="mt-4 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{template.body}</p>
              <div className="mt-4 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
                {template.isActive === false ? "Inactive" : "Active"}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit template" : "New template"} size="max-w-3xl">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <FormField label="Category" htmlFor="template-category" error={formErrors.category}>
            <select
              id="template-category"
              value={form.category}
              disabled={Boolean(editing)}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {JOB_CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Subject" htmlFor="template-subject" error={formErrors.subject}>
            <input id="template-subject" value={form.subject} maxLength={250} onChange={(event) => setForm({ ...form, subject: event.target.value })} className={inputClass} />
          </FormField>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
            <FormField label="Email body" htmlFor="template-body" error={formErrors.body}>
              <textarea
                id="template-body"
                rows={12}
                value={form.body}
                maxLength={20000}
                onChange={(event) => setForm({ ...form, body: event.target.value })}
                className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400"
              />
            </FormField>
            <aside className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h3 className="text-sm font-medium text-zinc-200">Placeholders</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Use these exact placeholders in the subject or body.</p>
              <div className="mt-3 space-y-2 text-xs">
                {["{{companyName}}", "{{jobRole}}", "{{hrName}}"].map((placeholder) => (
                  <code key={placeholder} className="block rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-emerald-300">{placeholder}</code>
                ))}
              </div>
            </aside>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="size-4 accent-emerald-400" />
            Active template
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-60">{saving ? "Saving..." : "Save template"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete template">
        <p className="text-sm leading-6 text-zinc-400">
          Delete the <strong className="text-zinc-200">{formatCategory(deleteTarget?.category)}</strong> template? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300">Cancel</button>
          <button type="button" onClick={handleDelete} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white">Delete template</button>
        </div>
      </Modal>
    </DashboardShell>
  );
}
