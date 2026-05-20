import { Plasma } from "./Plasma";

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
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden
      >
        <Plasma
          color="#00aad2"
          speed={0.5}
          direction="forward"
          scale={1.3}
          opacity={0.7}
          mouseInteractive={false}
        />
      </div>
      <div className="relative flex items-center justify-between px-5 py-3.5">
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
        <div className="flex items-center gap-2">
          <a
            href="https://hrax.co.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-medium tracking-tight text-white/90 backdrop-blur ring-1 ring-white/15 transition-colors hover:bg-white/15 hover:text-white active:scale-95"
            aria-label="hrax.co.kr 새 탭으로 열기"
          >
            <span>hrax.co.kr</span>
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
