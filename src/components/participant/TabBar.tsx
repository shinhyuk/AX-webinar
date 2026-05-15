"use client";

export type TabKey = "chat" | "qna" | "status";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "chat", label: "실시간 채팅", icon: "💬" },
  { key: "qna", label: "질문", icon: "❓" },
  { key: "status", label: "현재 상태", icon: "📊" },
];

type Props = {
  active: TabKey;
  onChange: (k: TabKey) => void;
};

export function TabBar({ active, onChange }: Props) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[--ax-border] bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-screen-sm grid-cols-3">
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <li key={t.key}>
              <button
                type="button"
                onClick={() => onChange(t.key)}
                className={
                  "flex w-full flex-col items-center justify-center gap-1 py-2.5 text-xs " +
                  (isActive
                    ? "text-[--hyundai-blue]"
                    : "text-[--ax-text-muted] hover:text-[--ax-text]")
                }
                aria-pressed={isActive}
              >
                <span className="text-base leading-none">{t.icon}</span>
                <span className="leading-none">{t.label}</span>
                <span
                  className={
                    "mt-0.5 block h-0.5 w-8 rounded-full " +
                    (isActive ? "bg-[--hyundai-blue]" : "bg-transparent")
                  }
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
