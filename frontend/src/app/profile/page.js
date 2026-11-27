"use client";

import { useAppContext } from "@/context/app-context";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/ui/page-header";

export default function ProfilePage() {
  const { state } = useAppContext();
  return (
    <DashboardShell>
      <PageHeader title="Profile" description="Your authenticated JobPilot account." />
      <section className="max-w-xl rounded-xl border border-zinc-800 bg-zinc-950 p-5">
        <dl className="grid gap-4">
          <div>
            <dt className="text-xs uppercase text-zinc-500">Name</dt>
            <dd className="mt-1 text-sm text-zinc-200">{state.user?.displayName || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Email</dt>
            <dd className="mt-1 text-sm text-zinc-200">{state.user?.email || "-"}</dd>
          </div>
        </dl>
      </section>
    </DashboardShell>
  );
}
