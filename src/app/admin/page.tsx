import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata = {
  title: "호스트 대시보드 | AX 웨비나",
};

export default function AdminPage() {
  return (
    <div
      className="flex h-[100dvh] flex-col bg-background"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <main className="flex-1 min-h-0">
        <AdminDashboard />
      </main>
    </div>
  );
}
