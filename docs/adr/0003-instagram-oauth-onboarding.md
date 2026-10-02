# ADR-0003: 공용 Meta 앱의 테스터를 Instagram OAuth로 가입·연결한다

- 상태: Accepted
- 결정일: 2026-09-20
- 대체: 사용자마다 Meta 앱과 토큰을 직접 만드는 Phase 1 모델 B 온보딩

## 맥락

Phase 1 방식은 기술적으로 동작하지만 사용자가 Meta 앱, webhook, 토큰, app secret을 직접
다뤄야 한다. Phase 2 완료 기준인 “지인이 설명 없이 연결”을 만족하지 못한다. 대상은 지인
최대 25명이며 App Review와 Advanced Access는 범위 밖이다.

## 결정

- 하나의 공용 Meta 앱을 사용하고 연결할 Instagram Professional 계정을 테스터로 초대한다.
- 초대 발송은 운영자가 Meta 대시보드에서 수동으로 한다. 서비스가 역할을 자동 부여하지 않는다.
- 사용자는 Instagram의 테스터 초대 화면에서 직접 수락해야 한다. 웹의 버튼은 해당 화면을
  새 창으로 열고 돌아올 경로를 제공할 뿐 대신 수락하지 않는다.
- 수락 후 Instagram Business Login OAuth를 실행한다. callback에서 code를 단기 토큰으로,
  다시 60일 장기 토큰으로 교환한다.
- callback은 `state`를 검증하고 `/me`로 `igUserId`와 username을 확인한 뒤 토큰을 암호화한다.
- 계정별 `subscribed_apps`를 호출하고 `comments`, `messages`를 되읽어 모두 확인된 경우에만
  `CONNECTED`로 전환한다.
- OAuth 성공 자체가 사전 초대·수락을 증명하므로 Instagram 사용자는 바로 `ACTIVE` 처리한다.
- 서비스 로그인은 Instagram ID를 기준으로 한다. OAuth가 이메일을 주지 않으므로 `User.email`과
  `passwordHash`는 선택값으로 바꾸고 기존 로컬 인증은 운영자용으로 유지한다.
- 웹 세션은 `HttpOnly; Secure; SameSite=Lax` 쿠키로 발급한다. Bearer JWT는 운영 도구 호환용으로 유지한다.

## 운영자와 사용자 책임

운영자는 최초 한 번 공용 앱의 OAuth redirect URI, webhook, Live 모드, 앱 시크릿을 설정한다.
사람마다 Instagram username을 테스터로 초대한다. 사용자는 Professional 계정을 준비하고
초대를 수락한 뒤 OAuth 동의를 한다. 토큰 교환·암호화·구독·갱신은 서비스가 맡는다.

## 결과

사용자는 토큰이나 app secret을 복사하지 않는다. 완전한 공개 셀프 가입은 아니다. 사람마다
운영자의 테스터 초대가 필요하며, 이 수동 단계를 없애려면 App Review/Advanced Access를 받는
새 결정이 필요하다.
