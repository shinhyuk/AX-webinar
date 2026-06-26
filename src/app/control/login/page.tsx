import { Suspense } from "react";
import { ControlLoginForm } from "@/components/control/ControlLoginForm";

export const metadata = {
  title: "운영자 로그인 | HR-AX Q&A",
};

export default function ControlLoginPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 py-10">
      <Suspense fallback={null}>
        <ControlLoginForm />
      </Suspense>
    </div>
  );
}
