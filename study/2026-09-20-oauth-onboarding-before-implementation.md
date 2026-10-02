# 토큰 입력을 없애려면 OAuth 버튼 하나보다 연결의 경계를 먼저 정해야 했다

> 2026-09-20 · Phase 2 착수 전 사전 설계 학습 기록
>
> 이 문서는 구현 결과 회고가 아닙니다. 가입 요청 화면 다음에 만들 OAuth 연결 구간에서
> 무엇을 검증하고, 어디까지를 서비스가 맡을지 정리한 사전 기록입니다. 실제 E2E 결과와
> 사용자가 멈춘 지점은 구현 뒤 별도 PAAR 회고에 남깁니다.

## 배경과 범위

Phase 1에서는 계정마다 사용자가 Meta 앱·토큰·app secret을 준비하는 모델 B로 실제 댓글 →
DM → 답장 → 양식 흐름을 검증했습니다. 기술적으로는 성립했지만, 지인이 설명 없이 연결할 수
있다는 Phase 2의 완료 기준에는 맞지 않았습니다. 토큰을 복사하고 webhook을 설정하는 일은
"게시글 하나 = 자동 DM 하나"라는 제품의 유일한 학습 모델보다 훨씬 어렵습니다.

이번 구현의 범위는 다음 네 가지입니다.

1. Instagram OAuth 시작·callback API
2. HttpOnly 세션 쿠키와 로그인 상태
3. OAuth 성공 뒤 계정·토큰 저장 및 webhook 구독 확인
4. 가입 요청 화면부터 연결 완료·오류 화면까지의 프런트 연결

게시글 목록, 자동 DM 생성, 대시보드 활동 내역, S3·CloudFront 배포는 이 문서의 범위 밖입니다.
연결 완료 뒤의 화면도 지금은 "첫 자동 DM 만들기"로 넘길 수 있는 상태까지만 다룹니다.

## 사실: 지금 있는 것과 없는 것

| 구분 | 현재 상태 |
|---|---|
| 가입 요청 | `POST /api/onboarding/requests`가 username을 정규화해 `REQUESTED`로 저장합니다. |
| 초대 대기 | 웹은 요청 ID만 `localStorage`에 두고 10초마다 상태를 읽습니다. `INVITED`일 때만 연결 버튼을 보입니다. |
| 운영자 처리 | 운영자가 Meta 대시보드에서 Instagram Tester 초대를 보내고, 별도 운영 명령으로 요청을 `INVITED`로 바꿉니다. |
| OAuth | 시작 endpoint, callback, `state` 검증, code/token 교환은 아직 없습니다. |
| 로그인 | 기존 이메일·비밀번호 Bearer JWT API는 있으나, 브라우저 세션 쿠키와 Instagram ID 로그인은 없습니다. |
| 계정 연결 | 암호화 저장소와 `InstagramApiClient`의 `/me`, 구독, 구독 재조회 기능은 있으나 OAuth 흐름에 연결되지 않았습니다. |

따라서 화면에 이미 있는 `수락했어요 · 연결하기` 버튼은 의도를 보여주는 자리표시자입니다.
`/oauth/instagram/start?request=...` 경로가 아직 없으므로 지금 누르면 실제 연결이 되지 않습니다.

## 판단: 수동 자격증명 모델을 공용 앱 OAuth 모델로 바꾼다

`ADR-0003`이 이 구간의 우선하는 결정입니다. 공용 Meta 앱 하나를 쓰고, 연결할
Instagram Professional 계정은 운영자가 Instagram Tester로 수동 초대합니다. 사용자는
Instagram 안에서 초대를 수락한 뒤 공식 OAuth 동의 화면만 거칩니다.

| 책임 | 하는 일 | 하지 않는 일 |
|---|---|---|
| 운영자 | 공용 앱의 redirect URI·webhook·Live 모드를 한 번 설정하고, 사람마다 Tester 초대를 보냅니다. | 서비스에서 Meta 역할을 자동 부여하지 않습니다. |
| 사용자 | Professional 계정을 준비하고 테스터 초대를 수락한 뒤 OAuth 권한에 동의합니다. | 비밀번호, access token, app secret을 서비스 화면에 입력하지 않습니다. |
| 서버 | code 교환, 토큰 암호화, 계정 확인, webhook 구독·검증, 세션 발급을 맡습니다. | 토큰·시크릿·댓글/DM 본문을 브라우저나 로그에 내보내지 않습니다. |

이 결정은 완전한 공개 가입이 아닙니다. App Review와 Advanced Access는 범위 밖이고, 최대
25명의 지인이라는 제약 아래서 운영자의 수동 초대를 남깁니다. 이 단계를 없애려면 단순한
OAuth 구현이 아니라 새 접근 권한 전략과 ADR이 필요합니다.

과거 Phase 2 문서의 "사용자가 자기 Meta 앱과 자격증명을 준비한다"는 설명은 Phase 1
운영·복구 경로의 기록입니다. 새 온보딩 구현은 그 설명을 따라 토큰 입력 폼이나 사용자별
app secret 저장을 다시 만들면 안 됩니다.

## 연결의 한 흐름

```
가입 요청                  운영자                 Instagram / Meta                 서버
REQUESTED ────────→ Tester 초대 ────────→ 사용자 수락
    │                       │                         │
    └── INVITED 화면 ← 상태 변경                       │
                                                   OAuth 동의
                                                        │ code + state
                                                        ▼
                                              state 검증 → 단기 토큰
                                                        → 60일 토큰
                                                        → /me 계정 확인
                                                        → 암호화 저장
                                                        → 구독 요청·재조회
                                                        → CONNECTED + 세션 쿠키
                                                        ▼
                                              완료 화면 → 다음 설정 화면
```

상태는 서비스 온보딩 상태와 Instagram 계정 상태를 섞지 않습니다.

| 상태 | 의미 | 화면의 다음 행동 |
|---|---|---|
| `REQUESTED` | username을 받았지만 운영자 초대 전입니다. | 초대 대기 및 상태 새로고침 |
| `INVITED` | 테스터 초대를 보냈습니다. | Instagram에서 수락한 뒤 연결 시작 |
| `AUTHORIZING` | OAuth callback 처리 중입니다. | 처리 결과를 기다림 |
| `CONNECTED` | 계정 확인·저장·구독 재조회까지 모두 통과했습니다. | 첫 자동 DM 만들기 |
| `ERROR` | 어느 한 단계가 안전하게 실패했습니다. | 사람이 읽는 원인을 보고 해당 단계 재시도 |

OAuth 성공은 곧 연결 성공이 아닙니다. callback이 `state`를 검증하고, code를 단기 토큰으로
교환한 뒤 60일 토큰으로 교환해야 합니다. 이어 `/me`의 `igUserId`와 username을 확인하고,
토큰을 암호화한 뒤 계정별 `subscribed_apps`를 호출합니다. 마지막으로 실제 구독 필드를
다시 읽어 `comments`와 `messages`가 모두 있을 때만 `CONNECTED`로 바꿉니다.

## 왜 세션과 state를 서버가 맡는가

OAuth callback에는 계정 접근 권한으로 이어지는 code가 옵니다. `state`가 시작 요청과
callback을 묶지 못하면 다른 브라우저 세션의 연결 결과를 잘못 받아들이는 CSRF 문제가 생깁니다.
그래서 `state`는 서버가 발급·검증합니다. OAuth 규격상 `state`는 Meta로 보내는 authorization
URL의 query parameter로 브라우저를 거쳐 callback URL로 돌아오므로 URL에 나타나는 것 자체를
피할 수 없습니다. 대신 `state`를 localStorage나 React 상태에 영구 보관하지 않고, 서버의
짧은 수명 검증 정보 또는 서명된 값으로 callback의 반환값과 대조합니다.

연결이 끝나면 Instagram ID를 사용자 식별자로 사용해 사용자를 `ACTIVE`로 처리하고,
`HttpOnly; Secure; SameSite=Lax` 세션 쿠키를 발급합니다. 프런트의 `fetch`는
`credentials: include`만 사용하며, access token·세션 토큰을 `localStorage`나 React 상태에
저장하지 않습니다. OAuth `state`는 authorization/callback URL을 통과하지만 브라우저 저장소에
영구 보관하지 않습니다. 가입 요청 ID만 초대 대기 복구를 위한 불투명 값으로
기존처럼 `localStorage`에 남깁니다.

기존 이메일·비밀번호와 Bearer JWT는 운영·복구 도구 호환성을 위해 유지합니다. 새 사용자
온보딩을 위해 이메일이나 비밀번호를 요구하면 OAuth가 줄이려는 입력을 다시 늘리는 셈입니다.

## Meta에서 이미 확인한 실패 지점

Phase 1 실계정 검증과 `docs/meta-api.md`는 아래를 구현 전 체크리스트로 남겼습니다.

| 확인할 것 | 이유 | 실패 시 사용자에게 보일 문구 |
|---|---|---|
| Instagram Tester 초대 수락 | OAuth 전에 역할이 있어야 합니다. | Instagram에서 테스터 초대를 먼저 수락해주세요 |
| Professional 계정 | Personal 계정은 대상이 아닙니다. | Business 또는 Creator 계정으로 전환해주세요 |
| 필요한 권한 동의 | 댓글·DM 운영 권한이 모두 필요합니다. | 자동 DM 운영에 필요한 권한을 모두 허용해주세요 |
| Live 모드와 앱 레벨 webhook 필드 | 테스트 버튼과 실제 이벤트는 같은 증거가 아닙니다. | 운영자가 Meta 앱 설정을 확인해야 합니다 |
| `POST /me/subscribed_apps` 뒤 `GET` 재조회 | POST가 성공을 반환해도 `comments`가 조용히 빠질 수 있습니다. | Meta 앱의 comments/messages 구독을 확인해주세요 |
| 토큰 교환과 `/me` 확인 | 만료된 code, 역할·권한·계정 오류를 연결 성공으로 기록하면 안 됩니다. | Instagram 연결 시간이 만료됐어요. 다시 연결해주세요 |

특히 구독 POST의 `success: true`는 충분한 증거가 아닙니다. Phase 1에서 `messages`만
구독되고 `comments`가 빠진 채 성공 응답을 받은 적이 있습니다. webhook이 실제로 오지 않는
조용한 실패라서, 쓰기 응답이 아니라 재조회한 필드를 성공 조건으로 삼습니다.

운영 로그에는 안전한 오류 코드와 어느 단계에서 멈췄는지만 남깁니다. access token과 app
secret은 AES-256-GCM 암호문으로 저장하고, 평문 토큰·시크릿·OAuth code·댓글·DM 본문은
로그에 남기지 않습니다.

## 구현 전·후 검증 기준

구현 전에는 아래 문서와 코드가 서로 모순되지 않는지 확인합니다.

- `docs/adr/0003-instagram-oauth-onboarding.md`: 공용 앱·테스터·OAuth·세션 결정
- `docs/onboarding.md`: 상태 전이와 사용자 오류 문구
- `docs/frontend.md`: 경로, `credentials: include`, 브라우저 저장소 경계
- `docs/meta-api.md`: 토큰·구독·webhook의 실측 제약
- 현재 `onboarding`, `auth`, Prisma 스키마: 이미 있는 상태와 새 흐름이 만나는 지점

구현 뒤에는 새 Professional 계정으로 아래 E2E를 수행합니다.

1. 가입 요청 → 운영자 초대 → 초대 수락 → OAuth 동의 → 연결 완료까지 한 번 관통합니다.
2. `comments`, `messages` 두 필드가 실제로 재조회되는지, 계정·토큰이 암호문으로만 저장되는지 확인합니다.
3. 콜백 state 불일치, 권한 거절, 초대 미수락, Personal 계정, 토큰 교환 실패, 필드 미구독마다
   토큰을 노출하지 않고 이해 가능한 오류 화면이 나오는지 확인합니다.
4. 완료 뒤 새 브라우저 요청이 HttpOnly 쿠키로 로그인 상태를 복원하고, JavaScript 저장소에
   access token이 없는지 확인합니다.

그 결과와 실제 사용자가 질문한 지점은 이 문서에 소급해 성공으로 적지 않고, 다음 PAAR
회고에서 사실·판단·조치·결과로 나눠 기록합니다.

## 면접용 30초 요약

> 댓글 자동 DM의 Phase 1은 사용자가 자기 Meta 앱과 토큰을 준비하는 방식으로 실계정
> 검증까지 마쳤지만, 지인이 혼자 쓰게 하려면 그 입력 자체를 없애야 했습니다. 그래서 공용
> Meta 앱에 Instagram Tester를 수동 초대하고 OAuth로 연결하는 흐름으로 바꿨습니다. 핵심은
> OAuth 성공을 연결 성공으로 보지 않는 것이었습니다. callback에서 state를 검증하고, 60일
> 토큰 교환, 계정 확인, webhook 구독 뒤 실제 구독 필드 재조회까지 통과해야 연결로 처리하게
> 설계했습니다. 또한 토큰은 브라우저에 두지 않고 AES-256-GCM 암호문으로 저장하며, 로그인은
> HttpOnly 세션 쿠키로 연결할 예정입니다. 구현 후에는 실제 사용자 E2E로 이 설계의 가정을
> 검증할 계획입니다.
