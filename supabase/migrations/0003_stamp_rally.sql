-- 0003: 어슬렁 타운홀 스탬프 랠리
-- 1) 기존 웨비나 채팅 데이터 전체 삭제
truncate table public.messages;

-- 2) 스탬프 수집 테이블 (기기별 client_id 기준, 부스당 1회)
create table if not exists public.stamp_visits (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  booth text not null,
  created_at timestamptz not null default now(),
  unique (client_id, booth)
);

-- 서버 API(서비스 롤) 전용 접근 — anon 정책을 만들지 않는다
alter table public.stamp_visits enable row level security;
