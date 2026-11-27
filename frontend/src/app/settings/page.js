"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { ErrorState } from "@/components/ui/error-state";
import { FormField } from "@/components/ui/form-field";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { getSendingSettings, updateSendingSettings } from "@/services/settings";

const inputClass = "h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-400";

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dailyLimit, setDailyLimit] = useState("20");
  const [delay, setDelay] = useState("30000");
  const [timezone, setTimezone] = useState("UTC");
  const [resumeSending, setResumeSending] = useState(false);

  async function loadSettings() {
    setLoading(true);
    setError("");
    try {
      const data = await getSendingSettings();
      setSettings(data);
      setDailyLimit(String(data.dailySendingLimit));
      setDelay(String(data.emailDelayMs));
      setTimezone(data.timezone);
    } catch (caught) {
      setError(caught?.message || "Unable to load sending settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(loadSettings, 0);
    return () => clearTimeout(timeout);
  }, []);

  async function handleSubmit(event) {
    event.preventEvent?.();
    event.preventDefault();
    const limit = Number(dailyLimit);
    const delayMs = Number(delay);
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
      toast.error("Daily sending limit must be between 1 and 20");
      return;
    }
    if (!Number.isInteger(delayMs) || delayMs < 1000 || delayMs > 300000) {
      toast.error("Delay must be between 1,000 and 300,000 milliseconds");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateSendingSettings({
        dailySendingLimit: limit,
        emailDelayMs: delayMs,
        timezone,
        resumeSending,
      });
      setSettings(updated);
      setResumeSending(false);
      toast.success("Sending settings saved");
    } catch (caught) {
      toast.error(caught?.message || "Unable to save sending settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <PageHeader title="Sending Settings" description="Configure approved limits and Gmail sending delay." />
      {loading ? <LoadingState label="Loading settings..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={loadSettings} /> : null}
      {!loading && !error && settings ? (
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          {settings.pausedSending ? (
            <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-300">
              Sending is paused: {settings.pauseReason || "Gmail quota or authorization requires attention"}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Daily sending limit" htmlFor="daily-limit" hint="Maximum 20 emails per user per day">
              <input id="daily-limit" type="number" min={1} max={20} value={dailyLimit} onChange={(event) => setDailyLimit(event.target.value)} className={inputClass} />
            </FormField>
            <FormField label="Delay between emails (ms)" htmlFor="email-delay" hint="Between 1,000 and 300,000 ms">
              <input id="email-delay" type="number" min={1000} max={300000} value={delay} onChange={(event) => setDelay(event.target.value)} className={inputClass} />
            </FormField>
          </div>

          <FormField label="Timezone" htmlFor="timezone">
            <input id="timezone" value={timezone} maxLength={100} onChange={(event) => setTimezone(event.target.value)} className={inputClass} />
          </FormField>

          {settings.pausedSending ? (
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={resumeSending} onChange={(event) => setResumeSending(event.target.checked)} className="size-4 accent-emerald-400" />
              Resume paused batches after saving
            </label>
          ) : null}

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-60">
              {saving ? "Saving..." : "Save settings"}
            </button>
          </div>
        </form>
      ) : null}
    </DashboardShell>
  );
}
