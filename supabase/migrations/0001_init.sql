-- HR-AX 라이브 세미나 Q&A — 초기 스키마
-- 적용: Supabase 콘솔 SQL Editor에 그대로 붙여넣기 (또는 supabase db push)

create extension if not exists "pgcrypto";

-- 질문/답변 메시지
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  nickname        text,
  content         text not null,
  status          text not null default 'pending',
  classification  jsonb,
  answer          text,
  approved_at     timestamptz,
  answered_at     timestamptz,
  constraint messages_status_check check (
    status in ('pending','rejected','queued','dismissed','approved','answered')
  )
);

create index if not exists messages_status_created_idx
  on public.messages (status, created_at desc);

-- 행사 설정 (단일 행)
create table if not exists public.config (
  id              int primary key default 1,
  ppt_embed_url   text,
  kb_text         text,
  topic_desc      text,
  updated_at      timestamptz default now(),
  constraint config_singleton check (id = 1)
);

insert into public.config (id)
values (1)
on conflict (id) do nothing;

-- RLS
alter table public.messages enable row level security;
alter table public.config   enable row level security;

-- 익명(청중)은 messages에 INSERT만 (pending으로). 어떤 select도 막는다.
drop policy if exists "anon insert messages" on public.messages;
create policy "anon insert messages"
  on public.messages for insert
  to anon
  with check (status = 'pending');

-- 익명에 messages SELECT 정책 없음 -> 읽기 거부

-- /admin (메인 화면)에서 anon이 answered 메시지만 실시간 구독할 수 있게 한다.
-- (Realtime은 RLS를 따른다. 따라서 answered만 보이도록 정책을 좁힌다.)
drop policy if exists "anon read answered" on public.messages;
create policy "anon read answered"
  on public.messages for select
  to anon
  using (status = 'answered');

-- config: 익명 read 허용(설정 표시용). write 차단.
drop policy if exists "anon read config" on public.config;
create policy "anon read config"
  on public.config for select
  to anon
  using (true);

-- /control 및 모든 server route는 service_role 키로 접근하므로 RLS를 우회한다.
-- 별도 service_role 정책 불필요.

-- Realtime 활성화 (Supabase: publication 'supabase_realtime'에 테이블 추가)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;
