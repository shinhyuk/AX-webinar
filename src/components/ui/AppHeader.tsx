type Props = {
  right?: React.ReactNode;
  subtitle?: string;
};

export function AppHeader({ right, subtitle }: Props) {
  return (
    <header
      className="ax-header-bg relative sticky top-0 z-30 overflow-hidden text-white"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="relative flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="ax-glow-cyan flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-hyundai-accent/30 to-[#7c3aed]/30 ring-1 ring-white/20 backdrop-blur">
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
            <span className="text-[10px] font-medium tracking-[0.22em] text-white/65">
              HYUNDAI AUTOEVER · HR AX추진TFT
            </span>
            <span className="text-[17px] font-bold tracking-tight">
              AX 웨비나
              {subtitle ? (
                <span className="ml-1.5 text-white/55 text-sm font-normal">
                  · {subtitle}
                </span>
              ) : null}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://hrax.co.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="ax-btn-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold tracking-tight text-white/90 hover:text-white"
            aria-label="hrax.co.kr 새 탭으로 열기"
          >
            <span>Info</span>
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M7 17 17 7" />
              <path d="M8 7h9v9" />
            </svg>
          </a>
          {right}
        </div>
      </div>
    </header>
  );
}
