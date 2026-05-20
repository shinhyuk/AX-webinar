import { Suspense } from "react";
import { AppHeader } from "@/components/ui/AppHeader";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const metadata = {
  title: "호스트 로그인 | AX 웨비나",
};

export default function AdminLoginPage() {
  return (
    <div className="ax-plasma-static relative flex min-h-[100dvh] flex-col overflow-hidden">
      <AppHeader />
      <main className="relative flex flex-1 items-center justify-center px-6 py-10">
        <Suspense fallback={null}>
          <AdminLoginForm />
        </Suspense>
      </main>
    </div>
  );
}
