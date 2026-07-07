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
  // 기본이 데모(타이틀 → H Chat → 변신 영상) 흐름. ?demo=0 으로 바로 메인 화면 진입 가능
  return <StageScreen demo={sp?.demo !== "0"} />;
}
