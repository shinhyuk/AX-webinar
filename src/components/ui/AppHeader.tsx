type Props = {
  right?: React.ReactNode;
  subtitle?: string;
};

export function AppHeader({ right, subtitle }: Props) {
  return (
    <header
      className="ax-header-bg sticky top-0 z-30 text-white"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/15">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M4 7h16" />
              <path d="M4 12h10" />
              <path d="M4 17h7" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] tracking-[0.22em] text-white/70">
              HYUNDAI AUTOEVER · HR AX추진TFT
            </span>
            <span className="text-[17px] font-semibold tracking-tight">
              AX 웨비나
              {subtitle ? (
                <span className="ml-1.5 text-white/60 text-sm font-normal">
                  · {subtitle}
                </span>
              ) : null}
            </span>
          </div>
        </div>
        {right ? <div>{right}</div> : null}
      </div>
    </header>
  );
}
