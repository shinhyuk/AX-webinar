type Props = {
  right?: React.ReactNode;
};

export function AppHeader({ right }: Props) {
  return (
    <header
      className="sticky top-0 z-30 bg-[--hyundai-blue] text-white shadow-sm"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] tracking-[0.18em] opacity-70">
            HYUNDAI AUTOEVER · HT AX추진TFT
          </span>
          <span className="text-lg font-semibold">AX 웨비나</span>
        </div>
        {right ? <div>{right}</div> : null}
      </div>
    </header>
  );
}
