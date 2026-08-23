# 테스트 커버리지 분석 및 개선 제안

> 분석 대상: `src/` 전체 (41개 파일, 4,218 LOC) · 분석일 2026-08-23

## 요약

**현재 커버리지는 0%다.** 테스트 파일도, 테스트 러너도, CI도 없다.

| 항목 | 상태 |
|---|---|
| 테스트 파일 (`*.test.*`, `*.spec.*`) | 0개 |
| 테스트 러너 (jest / vitest / playwright) | 미설치 |
| `npm test` 스크립트 | 없음 |
| CI (`.github/workflows`) | 없음 |
| 품질 게이트 | `eslint` 단독 |

라이브 웨비나 중 단 한 번의 회귀도 복구 기회가 없는 성격의 앱인데, 자동 검증 장치가 전혀 없다.
아래는 **위험도 × 테스트 작성 비용** 기준으로 정렬한 제안이다. Tier 1~4는 순수 함수 또는
얇은 목(mock)만으로 검증 가능하므로 투자 대비 효과가 가장 크다.

분석 과정에서 **실제 버그 3건**과 **로직 중복 4건**을 발견했다 (각 항목에 ⚠️ 표시).

---

## Tier 1 — 인증·인가 (최우선)

### `src/lib/control-auth.ts` — 운영자 인증 전체가 이 75줄에 있다

HMAC 토큰 발급/검증, 비밀번호 비교가 모두 여기 있고 검증 코드가 하나도 없다.
순수 함수라 목킹 없이 바로 테스트할 수 있다.

- `createControlToken()` → `verifyControlToken()` 왕복
- 만료 토큰 거부 (`expiresAt < Date.now()`)
- 서명 변조 토큰 거부
- `role`이 `control`이 아닌 위조 페이로드 거부
- 형식 오류: `undefined`, `""`, 점 2개, 점 4개
- 만료값이 숫자가 아닐 때 (`Number.isFinite` 가드)
- `CONTROL_PASSWORD` 미설정 시 `verifyControlPassword()`가 `false` 반환

⚠️ **키 캐싱 이슈**: `_keyPromise`가 모듈 레벨에 캐시된다 (control-auth.ts:13).
`CONTROL_PASSWORD`를 교체해도 프로세스가 살아있는 한 옛 키로 검증이 계속된다.
서버리스 컨테이너가 재사용되는 환경에서 비밀번호 로테이션이 즉시 반영되지 않는다는 뜻이다.
런타임 중 env를 바꾸는 테스트가 이걸 잡아낸다.

⚠️ **타이밍 누출**: `constantTimeEqual()`이 길이 불일치 시 즉시 반환한다 (control-auth.ts:48).
상수 시간을 표방하지만 비밀번호 **길이**는 타이밍으로 새어나간다.
양쪽을 먼저 해시한 뒤 비교하도록 고치고, 그 동작을 테스트로 고정할 것.

### `src/proxy.ts` — 라우트 보호

- 미인증 `/control/*` → `/control/login?from=...` 리다이렉트
- `/control/login`은 인증 없이 통과
- 유효 쿠키 보유 시 통과
- `startsWith("/control/login")`이므로 `/control/loginXYZ`도 통과된다 — 의도인지 테스트로 고정
- `from` 파라미터가 리다이렉트 URL에 그대로 반영된다. 이후 이 값으로 재이동시키는 코드가
  생기면 오픈 리다이렉트가 된다. same-origin 유지를 테스트로 못박아둘 것

> 참고: 프록시 matcher는 `/control/:path*`뿐이다. **`/api/control/*`는 프록시가 보호하지 않고**
> 각 라우트가 개별적으로 쿠키를 검사한다. 그래서 Tier 2가 중요하다.

---

## Tier 2 — 복사된 `readCookie` 7벌

보안에 직결되는 쿠키 파싱 함수가 **7개 파일에 그대로 복사돼 있다**:
`answer`, `config`, `delete-message`, `reset`, `upload-ppt`, `upload-url` + `queue`의 인라인 변형.

한 벌만 고치고 나머지를 놓치면 그 라우트만 조용히 뚫린다.

**제안**: `lib/control-auth.ts`로 `readControlCookie(req)`를 추출하고 한 번만 테스트한다.
7개의 발산 위험이 1개로 줄어든다. 테스트 케이스:

- 쿠키가 헤더 첫 번째가 아닐 때 (`other=1; ax_control=TOKEN`)
- 접두사 충돌 (`ax_control_x=evil`이 `ax_control`로 오인되지 않을 것)
- `Cookie` 헤더 자체가 없을 때
- 값에 `=`가 포함될 때

---

## Tier 3 — API 라우트 계약 (14개 라우트, 커버리지 0)

### 가장 가치 높은 단일 테스트

**라우트 디렉터리를 순회하며 "모든 `/api/control/*`는 쿠키 없이 401을 반환한다"를 검증하는
테이블 기반 테스트.** 지금은 인증 검사를 빠뜨린 라우트를 추가해도 아무도 모른다.

특히 `/api/control/reset`과 `/api/stamp/reset`은 `.delete().not("id","is",null)`로
**테이블 전체를 지운다**. 앱에서 가장 파괴적인 두 엔드포인트가 쿠키 하나로만 보호된다.
웨비나 도중에 발견할 일이 아니다.

### 검증 로직의 구체적 구멍

⚠️ **`/api/submit`이 `nickname` 길이를 검증하지 않는다** (submit/route.ts:17).
클라이언트는 모달과 `maxLength`로 12자를 강제하지만 API는 무제한으로 받고,
`nickname` 컬럼도 제약 없는 `text`다. 직접 POST하면 10KB짜리 닉네임이
무대 스크린에 렌더링된다. `content`는 500자로 막으면서 `nickname`은 통과한다.

- `/api/control/answer`: 잘못된 모델값이면 `"opus"`로 폴백하는데,
  `generateAnswer()`의 시그니처 기본값은 `"sonnet"`이다. 같은 결정에 기본값이 둘이다
- `/api/submit`: `MIN_CLASSIFY_LEN = 5` — 5자 미만 메시지는 분류 자체를 건너뛴다.
  "왜죠?" 같은 짧은 질문은 영원히 답변받지 못한다. 임계값을 테스트로 문서화할 것
- `/api/stamp/collect`: 코드 불일치 → 400, 미등록 부스 → 400, `clientId` 64자 초과 → 400.
  다만 `clientId`는 인증 없는 사용자 입력이므로 **타인의 clientId를 알면 그 사람의
  스탬프 카드를 조회·조작할 수 있다**. 이 노출면을 테스트로 명시할 것
- `/api/control/upload-url`: 확장자 검사가 클라이언트가 보낸 `name`에만 걸린다.
  `name: "../../evil.pdf"`로 경로 탈출이 되는지 (정규식이 막아주는지) 확인

---

## Tier 4 — LLM 출력 파싱 (순수 함수, 변경 빈도 높음)

`classify.ts`와 `answer.ts`는 자유 형식 모델 출력을 파싱한다 — 가장 깨지기 쉬운 지점인데
검증이 없다. SDK만 목킹하면 전부 결정적으로 테스트된다.

### `classifyQuestion()`

- 정상 JSON / ```json 펜스로 감싼 JSON / 앞뒤에 설명이 붙은 JSON
- ⚠️ **JSON 뒤에 `}`를 포함한 산문이 오는 경우** — `lastIndexOf("}")`가 엉뚱한 중괄호를
  잡아 파싱이 깨진다 (classify.ts:45)
- 중괄호가 없으면 `null`
- `is_question`이 boolean이 아니면 `null`
- 점수 클램핑: `is_question:true, score:0` → `1`, `score:150` → `100`,
  `score:-5` → `1`, `score:73.6` → `74`
- `reason` 누락 → `""`
- text가 아닌 content 블록만 올 때 → `null`

### `generateAnswer()`

- `kbText`가 `null`/빈 문자열/공백뿐일 때 → **API 호출 없이** 폴백.
  SDK가 호출되지 않았음을 단언할 것 (비용 회귀 방지)
- 모델 응답이 빈 문자열 → 폴백
- ⚠️ **`usedFallback`이 `answer.includes(FALLBACK_ANSWER)`로 판정된다** (answer.ts:47).
  정상 답변이 폴백 문장을 인용하기만 해도 "답변 불가"로 오분류되어
  청중 화면에서 답변이 통째로 숨겨진다 (submit/route.ts:79)

### 모델 ID 테이블 이중화

`types.ts`의 `ANSWER_MODEL_IDS`와 `anthropic.ts`의 `MODELS`가 별개로 존재하며 **이미 어긋났다**:
`MODELS.answer`는 `claude-sonnet-4-6`, `ANSWER_MODEL_IDS.sonnet`은 `claude-sonnet-5`.
`MODELS.answer`는 현재 아무도 쓰지 않는 죽은 코드다.
단일 출처로 합치고 그 사실을 테스트로 고정할 것.

---

## Tier 5 — 실시간 상태 리듀서 (실제 버그 있음)

### ⚠️ `useAnsweredMessages`의 상태 전이 버그

청중·무대 화면의 피드 전체를 이 훅이 들고 있다. 실시간 핸들러에 결함이 있다
(useAnsweredMessages.ts:70):

```ts
if (row.status && row.status !== "chat" && row.status !== "answered") {
  return;   // ← 그냥 무시하고 끝
}
```

호스트가 콘솔에서 메시지를 `rejected` / `dismissed` / `queued`로 바꾸면
UPDATE 이벤트가 도착하지만 핸들러가 **조기 반환하고 메시지는 화면에 그대로 남는다**.
하드 DELETE만 제거된다. 즉 **상태 변경을 통한 숨김 처리가 이미 접속 중인 모든
클라이언트에서 조용히 실패한다.** 라이브 행사 중 모더레이션 실패다.

지금 구조로는 테스트가 불가능하다 — 로직이 `useEffect` 안에 붙어 있다.
**순수 리듀서 `applyRealtimeEvent(state, payload)`로 추출**한 뒤 테스트:

- INSERT 신규 → 목록에 추가
- INSERT 중복 id (`seenRef`에 이미 존재) → 무시
- UPDATE 기존 → 병합, 위치 유지
- **UPDATE로 `rejected`/`dismissed`/`queued` 전환 → 제거되어야 함 (현재 안 됨)**
- DELETE → 제거 + `seen` 해제 (재삽입이 동작하도록)
- INSERT보다 UPDATE가 먼저 도착하는 순서 뒤바뀜
- 부트스트랩 fetch와 이른 실시간 이벤트의 경합

### `useOnlineCount`

- `track: false`(무대·운영자)일 때 `channel.track()`을 호출하지 않을 것 —
  무대 화면이 접속자 수에 잡히지 않게 하는 핵심 속성
- `role === "audience"`인 presence 키만 집계
- 같은 `clientId`의 다중 탭이 1명으로 계산되는지

---

## Tier 6 — 순수 표시 로직 (목킹 불필요, 저비용)

### ⚠️ 랭킹 로직이 두 벌이라 서로 다른 답을 낼 수 있다

`QuestionReport.rankQuestioners()`와 `StageScreen.TopQuestions()`가
같은 데이터에 대해 각자 필터·정렬한다. 동점 처리 규칙도 다르다
(전자는 `count`로 tiebreak, 후자는 tiebreak 없음).
**무대 스크린의 1위와 시상식 페이지의 1위가 갈릴 수 있다.** 프로젝터 앞에서 겪을 일이 아니다.
공용 `rankQuestions()` 하나로 합치고 테스트할 것.

`rankQuestioners` 테스트 케이스:
- `best` 동점 시 `count`로 tiebreak
- 닉네임이 null/공백이면 "익명"으로 병합 → **익명 참가자 여러 명이 한 항목으로 합쳐진다**
  (의도 확인 필요)
- `score <= 0` 제외, `is_question:false` 제외
- 빈 입력 → `[]`
- `total`을 누적하지만 정렬에도 렌더링에도 쓰이지 않는 죽은 필드

### ⚠️ `colorFromKey`가 두 파일에 바이트 단위로 동일하게 복사돼 있다

`StageScreen.tsx:869`, `AudienceChat.tsx:33`. 같은 닉네임은 두 화면에서 같은 색이어야 한다.
한쪽 팔레트만 수정되면 무대와 청중 화면의 색이 어긋난다. 추출 + 테스트 (한글 키 포함).

### 기타 순수 함수

- `deriveTheater(count)` — `THEATER_SCRIPT` 위의 순수 상태 머신.
  각 스텝 인덱스, `count > script.length`, `count = 0`, 음수
- `isPdfUrl()` — 쿼리스트링 포함, 프래그먼트 포함, 대문자 `.PDF`,
  URL이 아닌 상대 경로, 경로가 아닌 **쿼리**에만 `.pdf`가 있는 경우
- `formatTime()` — AudienceChat과 ControlConsole에 중복. `getHours()`가 로컬 타임존
  의존이므로 TZ를 고정해 테스트할 것

---

## Tier 7 — E2E 스모크 (행사 당일 반드시 살아있어야 하는 흐름)

Playwright는 이 환경에 이미 설치돼 있다 (`/opt/pw-browsers`). 3개면 충분하다:

1. **청중**: 닉네임 모달 → 메시지 전송 → 피드에 표시
2. **운영자**: 틀린 비밀번호 → 오류 표시 / 맞는 비밀번호 → 콘솔 진입 / 로그아웃 → 복귀
3. **스탬프**: `/stamp?b=snack&k=sn4k2t` 방문 → 스탬프 표시 + URL이 `/stamp`로 정리,
   잘못된 `k` → 오류, 새로고침해도 스탬프 유지

---

## 선행 과제: 개발 환경 문서가 낡았다

README와 `.env.local.example`이 **Upstash Redis + Pusher + `ADMIN_PASSWORD` /
`ADMIN_COOKIE_SECRET`**를 안내한다. 실제 코드는 **Supabase + `CONTROL_PASSWORD` +
`ANTHROPIC_API_KEY` + `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`**를 쓴다.
`.env.local.example`에는 실제로 필요한 변수가 **하나도 없다.**

문서대로 셋업한 사람은 앱도 테스트도 실행할 수 없다. 테스트 도입 전에 먼저 고칠 것.

---

## 권장 도입 순서

| 단계 | 작업 | 효과 |
|---|---|---|
| 0 | README / `.env.local.example` 현행화 | 아무나 실행 가능해짐 |
| 1 | Vitest 설치, `npm test` 추가, CI 워크플로 1개 | 회귀 감지의 토대 |
| 2 | Tier 1 (`control-auth`, `proxy`) | 인증 전체를 커버 |
| 3 | `readCookie` 추출 + Tier 3의 "모든 control 라우트 401" 테스트 | 7벌 중복 제거 |
| 4 | Tier 4 (LLM 파싱) — SDK 목킹 | 가장 깨지기 쉬운 지점 |
| 5 | `applyRealtimeEvent` 리듀서 추출 + Tier 5 | 발견된 모더레이션 버그 수정 |
| 6 | Tier 6 순수 함수 + 중복 로직 통합 | 저비용, 화면 간 불일치 제거 |
| 7 | Tier 7 E2E 3종 | 행사 당일 안전망 |

1~4단계만 해도 앱에서 **보안에 직결되는 코드는 사실상 전부** 커버된다.

---

## 발견된 이슈 요약

테스트 부재로 가려져 있던 항목들이다. 테스트 도입과 별개로 수정 판단이 필요하다.

| # | 위치 | 내용 |
|---|---|---|
| 1 | `useAnsweredMessages.ts:70` | 상태 변경(`rejected`/`dismissed`/`queued`)으로 숨김 처리 시 접속 중인 클라이언트에서 메시지가 사라지지 않음 |
| 2 | `submit/route.ts:17` | `nickname` 길이 미검증 — 무대 스크린에 임의 길이 문자열 렌더링 가능 |
| 3 | `answer.ts:47` | `usedFallback`을 부분 문자열로 판정 — 정상 답변이 오분류되어 숨겨질 수 있음 |
| 4 | `control-auth.ts:13` | 모듈 레벨 키 캐시로 비밀번호 로테이션이 즉시 반영되지 않음 |
| 5 | `control-auth.ts:48` | 상수 시간 비교가 길이 불일치 시 조기 반환 — 길이 누출 |
| 6 | 라우트 7개 | `readCookie` 중복 |
| 7 | `QuestionReport` / `StageScreen` | 랭킹 로직 이중화 — 두 화면의 순위가 갈릴 수 있음 |
| 8 | `types.ts` / `anthropic.ts` | 모델 ID 테이블 이중화, 이미 값이 어긋남 |
| 9 | README / `.env.local.example` | 실제 스택과 불일치 (Redis·Pusher vs Supabase) |
