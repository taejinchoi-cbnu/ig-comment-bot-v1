# Frontend 구현 기준

## 정보 구조와 경로

| 경로 | 화면 |
|---|---|
| `/` | 세션에 따라 가입 요청 또는 대시보드로 이동 |
| `/join` | Instagram username 입력과 가입 요청 |
| `/onboarding` | 초대 대기 → 초대 수락 → Instagram 연결 |
| `/oauth/instagram/callback` | OAuth 처리 결과 화면 |
| `/dashboard` | 계정 상태, 자동 DM 목록, 최근 활동 |
| `/automations/new` | 게시글 선택 + 보낼 DM |
| `/automations/:id` | 자동 DM 수정 |

화면 문구에는 `캠페인`, `트리거`, `시퀀스`를 쓰지 않는다. 사용자가 배우는 관계는
“게시글 하나 = 자동 DM 하나”뿐이다.

## 디자인 시스템

- 모바일 우선. 가입·온보딩·편집은 `max-width: 480px`, 대시보드는 데스크톱에서 확장한다.
- 바탕은 밝은 청회색, 표면은 흰색, 주요 행동은 선명한 파란색을 사용한다.
- 카드와 입력은 큰 radius와 얕은 그림자를 사용하고, 장식보다 간격과 문장으로 계층을 만든다.
- 모바일 주요 행동은 safe-area를 고려한 고정 하단 bar에 둔다.
- 최소 터치 영역 44px, 보이는 focus, label 연결, 오류 텍스트, reduced motion을 지킨다.
- 레퍼런스의 마법봉 floating button은 기능이 없으므로 복제하지 않는다.

정확한 토큰과 화면별 해석은 [`design-reference.md`](./design-reference.md)에 둔다.

## 데이터와 인증

- `apiFetch`는 JSON, 오류 정규화, `credentials: include`만 담당한다.
- Query key는 `['me']`, `['account']`, `['automations']`, `['events', cursor]`처럼 리소스 기준이다.
- OAuth `state`와 세션은 서버가 관리한다. access token을 localStorage나 JS 상태에 저장하지 않는다.
- 연결 대기 화면만 제한적으로 polling하고, 나머지는 mutation 성공 시 invalidate한다.

가입 요청은 `POST /api/onboarding/requests`로 저장하고 반환된 불투명 요청 ID만
`localStorage`에 보관한다. 대기 화면은 `GET /api/onboarding/requests/:id`를 10초마다 조회하며,
운영자가 `INVITED`로 바꾸기 전에는 OAuth 버튼을 노출하지 않는다.

## 배포

`pnpm -F @ig/web build` 산출물을 S3에 sync한 뒤 `index.html`만 CloudFront invalidation한다.
해시가 붙은 자산은 immutable로 배포한다. API URL은 상대 경로 `/api`를 사용한다.
