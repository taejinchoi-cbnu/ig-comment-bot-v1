# Instagram 가입·연결 흐름

## 상태

| 상태 | 사용자 화면 | 다음 행동 |
|---|---|---|
| `REQUESTED` | 가입 요청을 받았어요 | 운영자가 테스터 초대 |
| `INVITED` | Instagram에서 초대를 수락해주세요 | 외부 초대 관리 화면 열기 |
| `AUTHORIZING` | Instagram 연결 중 | OAuth callback 기다림 |
| `CONNECTED` | 세션 확인 후 연결 완료, 세션 없으면 로그인 안내 | 로그인 후 자동 DM 만들기 |
| `ERROR` | 사람이 이해할 수 있는 원인 | 해당 단계 다시 시도 |

`REQUESTED`와 `INVITED`는 서비스 온보딩 상태로 추가한다. Instagram 계정의 `DRAFT`,
`CONNECTED`, `ERROR`와 섞지 않는다.

## 사용자 흐름

1. Instagram username을 입력한다. 비밀번호, 토큰, Meta app secret은 받지 않는다.
2. 초대 전송 대기 화면을 본다.
3. `테스터 초대 수락하기`로 Instagram 외부 화면을 연다.
4. 돌아와 `Instagram으로 연결하기`를 누르고 권한에 동의한다.
5. callback 성공 후 연결 완료 화면과 `첫 자동 DM 만들기` 버튼을 본다.

## 운영자 흐름

1. 가입 요청의 username을 Meta App Roles의 Instagram Tester로 추가한다.
2. `pnpm onboarding list`에서 요청 ID를 확인하고 `pnpm onboarding invite <요청 ID>`로
   `INVITED`로 바꾼다. 별도 관리자 웹은 만들지 않는다.
3. 연결 실패 시 코드와 안전한 Meta 오류 요약을 확인한다. 토큰·본문은 로그에 남기지 않는다.

## 오류 문구

| 조건 | 화면 문구 |
|---|---|
| 초대 미수락/역할 없음 | Instagram에서 테스터 초대를 먼저 수락해주세요 |
| Personal 계정 | Business 또는 Creator 계정으로 전환해주세요 |
| 권한 거절 | 자동 DM 운영에 필요한 권한을 모두 허용해주세요 |
| 필드 미구독 | Meta 앱의 comments/messages 구독을 확인해주세요 |
| 토큰 교환 실패 | Instagram 연결 시간이 만료됐어요. 다시 연결해주세요 |

## 완료 조건

지인에게 서비스 URL만 전달한 뒤, 운영자는 테스터 초대만 수행한다. 사용자는 별도 설명 없이
초대 수락과 OAuth 동의를 마치고 자기 게시글 목록을 볼 수 있어야 한다.

## OAuth 개발·실계정 검증 준비

`ops/deploy.env` (gitignored) 또는 실행 환경에 `INSTAGRAM_APP_ID`,
`INSTAGRAM_APP_SECRET`, `PUBLIC_ORIGIN`을 설정한다. `PUBLIC_ORIGIN`은 경로와 끝 슬래시가
없는 HTTPS 출처다. 서명에 상위 Meta 앱 시크릿이 필요한 구성이라면
`META_PARENT_APP_SECRET`도 설정한다. 공용 앱의 기존 webhook callback URL과 verify token은
그대로 둔다. 신규 계정의 이벤트도 그 URL로 와서 `entry.id`별로 처리된다.

로컬 검증에서는 웹(Vite)과 API를 실행하고 웹의 포트(기본 5173)를 Cloudflare Quick Tunnel로
HTTPS 노출한다. Vite의 `/api`와 `/oauth` 프록시가 API로 전달한다. 생성된 터널 주소를
`PUBLIC_ORIGIN`으로 설정하고 API를 재시작한다. Meta 앱의 Instagram Business Login 허용
redirect URI에 `<터널 주소>/oauth/instagram/callback`을 정확히 등록한다. 터널을 다시 열어
주소가 바뀌면 이 값과 Meta 등록 URI를 함께 갱신해야 한다.

```bash
pnpm -F api dev
pnpm -F web dev
cloudflared tunnel --url http://localhost:5173
```

Meta 앱에서 `comments`와 `messages` webhook 필드를 앱 수준에서 먼저 구독한다. 연결할
Instagram Professional 계정을 Instagram Tester로 초대하고 사용자가 Instagram 앱에서
수락한다. 운영자는 `pnpm onboarding list`, `pnpm onboarding invite <요청 ID>`로
가입 요청을 `INVITED`로 바꾼다. 사용자는 초대 화면에서 돌아와 연결 버튼을 누른다.
서버는 OAuth, `/me` 계정 확인, 계정별 구독과 재조회까지 완료한 뒤에만 연결 완료 화면과
세션을 발급한다. 댓글·DM 실동작 검증에는 별도 Instagram 계정이 필요하다.

운영자가 검토한 마이그레이션을 `prisma migrate deploy`로 적용한 뒤 API를 실행한다. 로컬 환경의
`PUBLIC_ORIGIN`과 브라우저의 출처가 다르면 쿠키를 사용한 변경 요청은 403이 된다.


## 기존 사용자 로그인과 세션

`/login`의 “Instagram으로 로그인”은 `/oauth/instagram/login`에서 시작한다. 가입 요청과
테스터 초대는 최초 연결 때만 필요하다. 재로그인은 `/me`로 확인한 Instagram ID의 기존
`CONNECTED` 계정과 `ACTIVE` 소유자만 허용하며 사용자·계정·가입 요청을 생성하지 않는다.
계정의 소유자, ID, slug와 verify token을 유지하고, 댓글·메시지 구독을 되읽어 확인한 뒤
장기 토큰을 암호화 갱신한다. OAuth state는 연결/로그인 목적을 구분하고 두 흐름 모두
브라우저 결합, 10분 만료, 단일 소비를 적용한다.

브라우저는 토큰을 보관하지 않고 7일 `HttpOnly; Secure; SameSite=Lax` 쿠키를 사용한다.
`/api/auth/me`로 새로고침·화면 진입·창 복귀 때 세션을 확인한다. 401은 비로그인으로,
네트워크·서버 오류는 재시도 화면으로 처리한다. `/dashboard`, `/posts/select`는 인증 후에만
표시하고 연결 결과의 URL만으로 성공을 판단하지 않는다. 운영자 Bearer 인증은 유지한다.

로그아웃은 동일 출처의 `POST /api/auth/logout`이 성공한 뒤 진행 중인 쿼리를 취소하고
사용자 캐시와 로컬 가입 요청 ID를 지운다. 실패하면 현재 상태와 재시도 버튼을 유지한다.
쿠키 삭제는 현재 브라우저에만 적용한다. 서버 세션 저장소나 전체 기기 로그아웃은 없다.

### 이번 변경 적용·검증

`20261004010000_oauth_login`은 기존 state를 `CONNECT`로 유지하고 `LOGIN`의 requestId를
NULL로 제한한다. 클라이언트 생성은 `pnpm -F @ig/api generate`로 수행하며, 실제 DB 적용과
AWS 배포는 별도 운영 작업이다.

HTTPS 터널과 Meta redirect URI를 준비한 뒤 다음을 확인한다.

- 기존 계정 로그인 → 새로고침 → `/dashboard`, `/posts/select` 직접 접근
- 로그아웃 → 보호 경로에서 로그인 화면 → 재로그인
- 쿠키가 없는 별도 브라우저에서 기존 계정 로그인
- 세션 쿠키 삭제/만료 후 창 복귀와 보호 경로 접근
- 쿠키 없이 `/connection-result?status=connected` 접근 시 로그인 안내
- 미연결 계정·비활성 사용자·필드 구독 누락 시 세션 미발급
- 최초 가입 요청·초대·연결 흐름과 운영자 Bearer 인증 유지
