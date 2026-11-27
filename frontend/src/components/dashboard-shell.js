"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Send,
  Settings,
  UserRound,
  X,
  FolderKanban,
} from "lucide-react";
import { toast } from "sonner";
import { useAppContext } from "@/context/app-context";
import { getCurrentUser, logout } from "@/services/auth";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Applications", href: "/applications", icon: BriefcaseBusiness },
  { label: "CV Manager", href: "/cv-management", icon: FileText },
  { label: "Email Templates", href: "/email-templates", icon: Mail },
  { label: "Gmail Integration", href: "/gmail", icon: Send },
  { label: "Email Campaigns", href: "/email-composer", icon: Send },
  { label: "Sent History", href: "/sent-history", icon: FolderKanban },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function DashboardShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, dispatch } = useAppContext();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const user = await getCurrentUser();
        dispatch({ type: "AUTHENTICATED", payload: user });
      } catch {
        dispatch({ type: "SIGNED_OUT" });
        router.replace("/login");
      } finally {
        setChecking(false);
      }
    }
    checkSession();
  }, [dispatch, router]);

  async function handleLogout() {
    try {
      await logout();
      dispatch({ type: "SIGNED_OUT" });
      toast.success("Signed out");
      router.replace("/login");
    } catch (error) {
      toast.error(error?.message || "Unable to sign out");
    }
  }

  if (checking) {
    return (
      <main className="grid min-h-screen place-items-center">
        <span className="text-sm text-zinc-400">Checking your session...</span>
      </main>
    );
  }

  if (!state.isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-zinc-800 bg-zinc-950 transition-all lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-20" : "lg:w-64"} w-64`}
      >
        <div className="flex h-16 items-center border-b border-zinc-800 px-4">
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-3"
            onClick={() => setMobileOpen(false)}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-400 text-zinc-950">
              <BriefcaseBusiness className="size-5" />
            </span>
            {!collapsed ? (
              <span className="font-semibold tracking-tight">JOBPILOT</span>
            ) : null}
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            className="ml-auto grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-900 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-emerald-400/10 text-emerald-300"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                } ${collapsed ? "lg:justify-center" : ""}`}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-800 p-3">
          <Link
            href="/profile"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 ${
              collapsed ? "lg:justify-center" : ""
            }`}
          >
            <UserRound className="size-4 shrink-0" />
            {!collapsed ? <span className="truncate">{state.user?.displayName || state.user?.email}</span> : null}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className={`mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 ${
              collapsed ? "lg:justify-center" : ""
            }`}
          >
            <LogOut className="size-4 shrink-0" />
            {!collapsed ? <span>Logout</span> : null}
          </button>
        </div>
      </aside>

      <button
        type="button"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={() => setCollapsed((value) => !value)}
        className="fixed bottom-5 left-[calc(var(--sidebar-width,256px)-14px)] z-[60] hidden size-7 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-400 lg:grid"
        style={{ left: collapsed ? "66px" : "242px" }}
      >
        {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
      </button>

      <div className={`transition-all ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-zinc-800 bg-zinc-950/95 px-4 backdrop-blur sm:px-6 lg:hidden">
          <button
            type="button"
            aria-label="Open navigation"
            className="grid size-9 place-items-center rounded-md border border-zinc-800 text-zinc-300"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <span className="ml-3 font-semibold tracking-tight">JOBPILOT</span>
        </header>
        <main className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
