import { AppHeader } from "@/components/ui/AppHeader";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata = {
  title: "호스트 대시보드 | AX 웨비나",
};

export default function AdminPage() {
  return (
    <div className="flex h-[100dvh] flex-col">
      <AppHeader
        right={
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-white backdrop-blur ring-1 ring-white/15">
            HOST
          </span>
        }
      />
      <main className="flex-1 min-h-0">
        <AdminDashboard />
      </main>
    </div>
  );
}
