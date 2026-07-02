-- Delta 마이그레이션: 자유 채팅 흐름 + AI 답변 + PPT 업로드
-- 적용: Supabase SQL Editor에 그대로 붙여넣기 → Run

-- 1) 'chat' 상태 허용 + 답변 모델 컬럼
alter table public.messages
  drop constraint if exists messages_status_check;
alter table public.messages
  add constraint messages_status_check check (
    status in ('pending','rejected','queued','dismissed','approved','answered','chat')
  );

alter table public.messages
  add column if not exists model text;

-- 2) 익명이 채팅/답변 메시지를 SELECT 가능하게 확장 (전체 채팅 피드)
drop policy if exists "anon read answered" on public.messages;
drop policy if exists "anon read messages" on public.messages;
create policy "anon read messages"
  on public.messages for select
  to anon
  using (status in ('chat','answered'));

-- 3) Supabase Storage: 공개 버킷 'ppt' 생성 + anon 읽기 정책
insert into storage.buckets (id, name, public)
values ('ppt', 'ppt', true)
on conflict (id) do nothing;

drop policy if exists "public read ppt" on storage.objects;
create policy "public read ppt"
  on storage.objects for select
  to anon
  using (bucket_id = 'ppt');
