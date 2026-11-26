import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950/70 p-8 shadow-2xl shadow-black/30 sm:p-12">
        <div className="mb-12 flex items-center gap-3 text-sm font-semibold tracking-wide text-zinc-200">
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-400 text-zinc-950">
            <BriefcaseBusiness className="size-5" />
          </span>
          JOBPILOT
        </div>
        <p className="mb-4 text-sm font-medium text-emerald-300">
          Application workflow, with intention.
        </p>
        <h1 className="max-w-md text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Organize every thoughtful application.
        </h1>
        <p className="mt-5 max-w-lg leading-7 text-zinc-400">
          Track opportunities, prepare tailored outreach, and review every email
          before it is sent.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 font-medium text-zinc-950 transition hover:bg-emerald-300"
            href="/login"
          >
            Get started <ArrowRight className="size-4" />
          </Link>
          <span className="inline-flex items-center gap-2 px-2 py-2.5 text-sm text-zinc-500">
            <ShieldCheck className="size-4 text-zinc-400" /> Review before sending
          </span>
        </div>
      </section>
    </main>
  );
}
