# AX 웨비나 모바일 웹

현대오토에버 HT AX추진TFT가 현대자동차그룹 임직원을 대상으로 진행하는 AX 웨비나의 실시간 참여 페이지.

## 주요 기능

- **실시간 채팅**: 모든 참가자가 실시간으로 메시지를 주고받습니다.
- **질문 (Q&A)**: 참가자가 등록한 질문은 최신순으로 표시되며, 호스트가 "답변완료" 처리하면 자동으로 하단으로 이동합니다.
- **현재 상태**: `정말 흥미로워요 / 좋아요 / 그저그래요 / 어려워요` 4가지 중 하나를 선택. 분포를 실시간 막대그래프로 표시합니다.
- **호스트 화면 (`/admin`)**: 비밀번호 보호. 질문 답변완료/삭제, 통계 확인, 전체 초기화 가능.

## 기술 스택

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (모바일 우선, iOS safe-area 대응)
- Upstash Redis (Vercel KV 호환) — `@upstash/redis`
- Pusher Channels — 실시간 브로드캐스트
- 호스트 인증: HMAC 서명 httpOnly 쿠키

## 환경변수

`.env.local.example`을 참고해 `.env.local`을 작성합니다.

```
KV_REST_API_URL=
KV_REST_API_TOKEN=
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=ap3
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=ap3
ADMIN_PASSWORD=
ADMIN_COOKIE_SECRET=
```

## 로컬 개발

```bash
npm install
npm run dev
```

`http://localhost:3000` 참가자, `http://localhost:3000/admin` 호스트.

## Vercel 배포

1. GitHub 저장소를 Vercel에 import.
2. Storage → Marketplace에서 Redis(Upstash) 통합을 프로젝트에 추가 → `KV_REST_API_URL`, `KV_REST_API_TOKEN` 자동 주입.
3. Pusher 앱을 생성(클러스터 `ap3` 권장)하고 키를 Vercel 환경변수로 설정.
4. `ADMIN_PASSWORD`, `ADMIN_COOKIE_SECRET`(32자 이상 무작위 문자열) 설정.
5. `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`도 추가.
6. 재배포.

## 데이터 모델 (Redis 키)

| 키 | 타입 | 용도 |
|---|---|---|
| `ax:chat:messages` | List | 채팅 메시지 (최근 500개 보존, 200개 응답) |
| `ax:questions:all` | Hash | 질문 본문 (id → JSON) |
| `ax:questions:pending` | Sorted Set | 미답변 질문 (score=ts) |
| `ax:questions:answered` | Sorted Set | 답변완료 질문 (score=answeredAt) |
| `ax:reactions:byUser` | Hash | 사용자별 현재 상태 (1인 1반응) |
| `ax:reactions:counts` | Hash | 상태별 카운트 |
| `ax:ratelimit:chat:{userId}` | TTL string | 채팅 레이트리밋 (10초당 30회) |

## 웨비나 운영 체크리스트

- [ ] 시작 30분 전 호스트가 `/admin` 접속 → 전체 초기화 1회 실행
- [ ] Pusher 동시접속 상한 확인 (무료 100, Startup 500 / 운영 시 Startup 권장)
- [ ] 호스트 2명 이상 `/admin` 접속해두기 (답변완료 처리용 + 백업)
- [ ] 참가자에게 페이지 URL을 QR/링크로 안내
