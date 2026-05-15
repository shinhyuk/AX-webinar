"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void handleLogout()}
      className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-background active:scale-95 disabled:opacity-50"
    >
      로그아웃
    </button>
  );
}
