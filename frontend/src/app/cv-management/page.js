"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { FormField } from "@/components/ui/form-field";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { deleteCv, getCvAccessUrl, listCvs, uploadCv } from "@/services/cvs";
import { JOB_CATEGORIES } from "@/utils/constants";

const inputClass = "h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-400";

export default function CvManagementPage() {
  const [cvs, setCvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("technology");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileError, setFileError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function loadCvs() {
    setLoading(true);
    setError("");
    try {
      setCvs(await listCvs());
    } catch (caught) {
      setError(caught?.message || "Unable to load CVs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(loadCvs, 0);
    return () => clearTimeout(timeout);
  }, []);

  function chooseFile(event) {
    const selected = event.target.files?.[0];
    setFileError("");
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setFile(null);
      setFileError("Only PDF files are allowed.");
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setFile(null);
      setFileError("CV files must be 5 MB or smaller.");
      return;
    }
    setFile(selected);
  }

  async function handleUpload(event) {
    event.preventDefault();
    if (!file) {
      setFileError("Select a PDF CV to upload.");
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      await uploadCv(category, file, (event) => {
        if (event.total) setProgress(Math.round((event.loaded * 100) / event.total));
      });
      toast.success("CV uploaded");
      setFile(null);
      setProgress(0);
      await loadCvs();
      event.target.reset();
    } catch (caught) {
      toast.error(caught?.message || "Unable to upload CV");
    } finally {
      setUploading(false);
    }
  }

  async function openCv(cv) {
    try {
      const url = await getCvAccessUrl(cv._id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (caught) {
      toast.error(caught?.message || "Unable to open CV");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCv(deleteTarget._id);
      toast.success("CV deleted");
      setDeleteTarget(null);
      await loadCvs();
    } catch (caught) {
      toast.error(caught?.message || "Unable to delete CV");
    }
  }

  return (
    <DashboardShell>
      <PageHeader
        title="CV Manager"
        description="Maintain one PDF CV for each job category."
      />

      <section className="mb-6 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
        <h2 className="font-medium text-zinc-100">Upload CV</h2>
        <form onSubmit={handleUpload} className="mt-4 grid gap-4 md:grid-cols-[220px_minmax(220px,1fr)_auto] md:items-end">
          <FormField label="Category" htmlFor="cv-category">
            <select
              id="cv-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={inputClass}
            >
              {JOB_CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </FormField>
          <FormField label="PDF file" htmlFor="cv-file" error={fileError}>
            <input
              id="cv-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={chooseFile}
              className="block h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-400 file:mr-3 file:border-0 file:bg-transparent file:text-sm file:text-zinc-300"
            />
          </FormField>
          <button
            type="submit"
            disabled={uploading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 text-sm font-medium text-zinc-950 disabled:opacity-60"
          >
            <Upload className="size-4" />
            {uploading ? `Uploading ${progress}%` : "Upload CV"}
          </button>
        </form>
      </section>

      {loading ? <LoadingState label="Loading CVs..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={loadCvs} /> : null}
      {!loading && !error && !cvs.length ? (
        <EmptyState
          title="No CVs uploaded"
          description="Upload a PDF CV for a job category to use in application emails."
        />
      ) : null}

      {!loading && !error && cvs.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cvs.map((cv) => (
            <article key={cv._id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-emerald-400/10 text-emerald-300">
                  <FileText className="size-5" />
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label={`Open ${cv.originalFileName}`}
                    onClick={() => openCv(cv)}
                    className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  >
                    <Download className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${cv.originalFileName}`}
                    onClick={() => setDeleteTarget(cv)}
                    className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-rose-950 hover:text-rose-300"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <h2 className="mt-4 truncate font-medium text-zinc-100">{cv.originalFileName}</h2>
              <p className="mt-1 text-sm text-zinc-500">{JOB_CATEGORIES.find(([value]) => value === cv.category)?.[1] || cv.category}</p>
              <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3 text-xs text-zinc-500">
                <span>{cv.fileSizeBytes ? `${Math.round(cv.fileSizeBytes / 1024)} KB` : "PDF"}</span>
                <span>{cv.createdAt ? new Date(cv.createdAt).toLocaleDateString() : "-"}</span>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete CV">
        <p className="text-sm leading-6 text-zinc-400">
          Delete <strong className="text-zinc-200">{deleteTarget?.originalFileName}</strong>? The category will no longer have a CV.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300">Cancel</button>
          <button type="button" onClick={handleDelete} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white">Delete CV</button>
        </div>
      </Modal>
    </DashboardShell>
  );
}
