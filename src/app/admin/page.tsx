import { StageScreen } from "@/components/stage/StageScreen";

export const metadata = {
  title: "HR-AX 라이브 세미나 — 메인 화면",
};

export default async function StagePage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const sp = await searchParams;
  return <StageScreen demo={sp?.demo === "1"} />;
}
