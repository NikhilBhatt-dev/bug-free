"use client";

import { Clock3 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/ui/page-header";

export function ComingSoonPage({ title, description }) {
  return (
    <DashboardShell>
      <PageHeader title={title} description={description} />
      <section className="grid min-h-[420px] place-items-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50">
        <div className="max-w-sm text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400">
            <Clock3 className="size-5" />
          </span>
          <h2 className="mt-4 text-lg font-medium text-zinc-100">Coming soon</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            This module is intentionally reserved for a future implementation phase.
          </p>
        </div>
      </section>
    </DashboardShell>
  );
}
