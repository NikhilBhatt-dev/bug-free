"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useAppContext } from "@/context/app-context";
import { getCurrentUser } from "@/services/auth";

export default function DashboardPage() {
  const router = useRouter();
  const { dispatch } = useAppContext();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const user = await getCurrentUser();
        dispatch({ type: "AUTHENTICATED", payload: user });
      } catch {
        dispatch({ type: "SIGNED_OUT" });
        router.replace("/login");
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, [dispatch, router]);

  if (isLoading) {
    return (
      <main className="grid flex-1 place-items-center">
        <LoaderCircle
          className="size-6 animate-spin text-emerald-300"
          aria-label="Loading dashboard"
        />
      </main>
    );
  }

  return null;
}
