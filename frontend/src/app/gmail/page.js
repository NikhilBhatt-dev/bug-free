"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard-shell";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { disconnectGmail, getGmailStatus, startGmailConnection } from "@/services/gmail";

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function GmailPageContent() {
  const searchParams = useSearchParams();
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function loadStatus() {
    setLoading(true);
    setError("");
    try {
      setConnection(await getGmailStatus());
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to load Gmail connection status"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(loadStatus, 0);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const gmailOutcome = searchParams.get("gmail");
    if (!gmailOutcome) return;
    if (gmailOutcome === "connected") toast.success("Gmail connected");
    if (gmailOutcome === "error") {
      const reason = searchParams.get("reason");
      toast.error(reason === "access_denied" ? "Gmail authorization was cancelled" : "Gmail authorization failed");
    }
  }, [searchParams]);

  async function handleConnect() {
    setConnecting(true);
    try {
      const url = await startGmailConnection();
      window.location.assign(url);
    } catch (caught) {
      toast.error(getErrorMessage(caught, "Unable to start Gmail authorization"));
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectGmail();
      toast.success("Gmail disconnected");
      setDisconnectOpen(false);
      await loadStatus();
    } catch (caught) {
      toast.error(getErrorMessage(caught, "Unable to disconnect Gmail"));
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Gmail Integration"
        description="Authorize JobPilot to send applications from your Gmail account."
        action={
          <button
            type="button"
            onClick={loadStatus}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900"
          >
            <RefreshCw className="size-4" /> Refresh
          </button>
        }
      />

      {loading ? <LoadingState label="Loading Gmail connection..." /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={loadStatus} /> : null}

      {!loading && !error ? (
        <section className="max-w-2xl rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex items-start gap-4">
            <span className={`grid size-11 place-items-center rounded-xl ${connection?.connected ? "bg-emerald-400/10 text-emerald-300" : "bg-zinc-900 text-zinc-400"}`}>
              <Mail className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${connection?.connected ? "bg-emerald-400" : "bg-zinc-600"}`} />
                <h2 className="font-medium text-zinc-100">
                  {connection?.connected ? "Gmail connected" : "Gmail not connected"}
                </h2>
              </div>
              {connection?.email ? (
                <p className="mt-2 text-sm text-zinc-400">{connection.email}</p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {connection?.connected
                    ? "Connection active. Account email is not disclosed by the connected Gmail scope."
                    : "Connect Gmail before sending application emails."}
                </p>
              )}
              {connection?.connectedAt ? (
                <p className="mt-2 text-xs text-zinc-500">
                  Connected {new Date(connection.connectedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {connection?.connected ? (
              <button
                type="button"
                onClick={() => setDisconnectOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-900/60 px-4 py-2.5 text-sm text-rose-300 hover:bg-rose-950"
              >
                <Unplug className="size-4" /> Disconnect Gmail
              </button>
            ) : (
              <button
                type="button"
                disabled={connecting}
                onClick={handleConnect}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-medium text-zinc-950 disabled:opacity-60"
              >
                <Mail className="size-4" />
                {connecting ? "Opening Google..." : "Connect Gmail"}
              </button>
            )}
          </div>
        </section>
      ) : null}

      <Modal open={disconnectOpen} onClose={() => setDisconnectOpen(false)} title="Disconnect Gmail">
        <p className="text-sm leading-6 text-zinc-400">
          This removes JobPilot&apos;s ability to send emails from the connected account. Existing sent history remains available.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setDisconnectOpen(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300">Cancel</button>
          <button type="button" disabled={disconnecting} onClick={handleDisconnect} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      </Modal>
    </DashboardShell>
  );
}

export default function GmailPage() {
  return (
    <Suspense fallback={<DashboardShell><LoadingState label="Loading Gmail integration..." /></DashboardShell>}>
      <GmailPageContent />
    </Suspense>
  );
}
