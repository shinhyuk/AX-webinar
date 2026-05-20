import { Suspense } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { Plasma } from "@/components/ui/Plasma";

export const metadata = {
  title: "호스트 로그인 | AX 웨비나",
};

export default function AdminLoginPage() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <Plasma
          color="#00d4ff"
          speed={0.4}
          direction="forward"
          scale={1.5}
          opacity={0.85}
          mouseInteractive={false}
        />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(5,8,22,0.4)_0%,rgba(5,8,22,0.85)_60%,rgba(5,8,22,0.95)_100%)]" />
      </div>
      <AppHeader />
      <main className="relative flex flex-1 items-center justify-center px-6 py-10">
        <Suspense fallback={null}>
          <AdminLoginForm />
        </Suspense>
      </main>
    </div>
  );
}
