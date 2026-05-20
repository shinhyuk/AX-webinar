"use client";

export type TabKey = "chat" | "qna" | "status";

type TabDef = {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
};

function IconChat({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-4.7A8.38 8.38 0 0 1 3 11.5a8.5 8.5 0 1 1 18 0z" />
    </svg>
  );
}

function IconQuestion({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5" />
      <line x1="12" y1="17" x2="12" y2="17.01" />
    </svg>
  );
}

function IconChart({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <line x1="6" y1="20" x2="6" y2="13" />
      <line x1="12" y1="20" x2="12" y2="6" />
      <line x1="18" y1="20" x2="18" y2="9" />
    </svg>
  );
}

const TABS: TabDef[] = [
  { key: "chat", label: "실시간 채팅", icon: <IconChat active={false} /> },
  { key: "qna", label: "질문", icon: <IconQuestion active={false} /> },
  { key: "status", label: "현재 상태", icon: <IconChart active={false} /> },
];

type Props = {
  active: TabKey;
  onChange: (k: TabKey) => void;
};

export function TabBar({ active, onChange }: Props) {
  return (
    <nav
      className="ax-glass-strong fixed inset-x-0 bottom-0 z-20 border-t border-line"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-screen-sm grid-cols-3 px-2 pt-2">
        {TABS.map((t) => {
          const isActive = t.key === active;
          const Icon =
            t.key === "chat"
              ? IconChat
              : t.key === "qna"
                ? IconQuestion
                : IconChart;
          return (
            <li key={t.key}>
              <button
                type="button"
                onClick={() => onChange(t.key)}
                aria-pressed={isActive}
                className={
                  "group flex w-full flex-col items-center justify-center gap-1 py-2 transition-colors " +
                  (isActive
                    ? "text-hyundai-accent"
                    : "text-muted active:text-foreground")
                }
              >
                <span
                  className={
                    "flex h-9 w-12 items-center justify-center rounded-full transition-all " +
                    (isActive
                      ? "bg-gradient-to-br from-hyundai-accent/25 to-[#7c3aed]/25 ring-1 ring-hyundai-accent/30 shadow-[0_0_18px_rgba(0,212,255,0.35)]"
                      : "bg-transparent")
                  }
                >
                  <Icon active={isActive} />
                </span>
                <span
                  className={
                    "text-[11px] " +
                    (isActive ? "font-bold" : "font-medium")
                  }
                >
                  {t.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
