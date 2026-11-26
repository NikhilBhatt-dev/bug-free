import Link from "next/link";
import { BriefcaseBusiness, LockKeyhole } from "lucide-react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
        <Link
          className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-zinc-100"
          href="/"
        >
          <BriefcaseBusiness className="size-5 text-emerald-300" /> JOBPILOT
        </Link>
        <h1 className="text-3xl font-semibold text-white">
          Sign in to JobPilot
        </h1>
        <p className="mt-3 leading-7 text-zinc-400">
          Use your Google account to securely access your personal application
          workspace.
        </p>
        <a
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 font-medium text-zinc-950 transition hover:bg-zinc-200"
          href={`${apiUrl}/auth/google`}
        >
          Continue with Google
        </a>
        <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-zinc-500">
          <LockKeyhole className="mt-0.5 size-4 shrink-0" />
          JobPilot requests only basic Google identity details at sign-in. Gmail
          access is not requested here.
        </p>
      </section>
    </main>
  );
}
