# 0004 — Jest·Vitest와 측정 전용 코드 커버리지

- 상태: Accepted
- 날짜: 2026-10-04

## 배경

Node 내장 테스트는 순수 함수와 주입된 의존성의 분기 검증에 충분했다. 이제 Nest의 실제 HTTP 인증, 쿠키·리다이렉트와 React의 라우터·세션 화면을 함께 검증해야 한다. 데코레이터 메타데이터, DOM 환경과 전체 소스 커버리지 리포트를 지원하는 도구가 필요하다.

## 결정

API는 Jest 30 + 호환되는 ts-jest, core와 같은 버전의 `@nestjs/testing`, Supertest를 사용한다. CJS 변환과 데코레이터 메타데이터를 유지하고, 실제 `.js` 파일이 없을 때만 상대 `.ts` 경로로 해석하는 테스트 resolver를 둔다. ESM으로 배포되는 `@nestjs/jwt`의 JavaScript만 테스트에서 CJS로 변환하도록 허용하며 다른 외부 패키지는 변환하지 않는다. 운영 빌드는 그대로 유지한다.

웹은 Vitest + React Testing Library + user-event + jest-dom + jsdom을 사용하며 Vite React 설정을 재사용한다. 서비스 테스트와 공유 패키지는 Node 환경에서 실행한다. Vitest와 `@vitest/coverage-v8`은 같은 버전으로 고정하고 선택한 버전은 package.json과 lockfile에 기록한다.

기존 테스트 시나리오와 `node:assert`는 유지하고 등록·훅·mock만 각 러너로 이관한다. 새 테스트는 `expect`를 사용한다. 테스트와 설정 파일도 타입 검사한다. 기본 API 테스트에서 운영 환경 파일을 차단하고 가짜 DB·AWS·Instagram 의존성을 주입한다. 실제 DB 테스트는 `TEST_DATABASE_URL`을 명시한 별도 명령에만 포함하며 데이터 정리·연결 종료를 보장한다.

Jest와 Vitest 모두 V8로 각 패키지의 전체 `src`를 측정한다. 테스트·지원 코드·타입 선언·Prisma 생성 코드는 제외한다. 패키지별 `coverage/`에 HTML·LCOV·JSON 요약을 만들고 터미널에 구문·분기·함수·줄 결과를 표시한다. **최소 통과율은 설정하지 않는다.** 테스트 실패나 커버리지 생성 오류는 명령 실패다. 산출물은 Git에서 제외한다.

`pnpm verify`는 타입 검사 → 커버리지 테스트 → 전체 빌드를 실행한다. Lambda 번들은 별도 `build:lambda`로 검증한다. 이번 결정은 CI 구축, DB 스키마·제품 변경과 운영 배포를 포함하지 않는다.

## 대안과 영향

Node 내장 러너에 별도의 DOM·변환·커버리지 조합을 더하면 도구 연결을 직접 관리해야 한다. 전 패키지를 Vitest로 통일하는 방안보다 API에 ts-jest를 사용하면 기존 TypeScript 데코레이터 변환을 유지하기 쉽다. 대신 두 러너의 설정과 의존성을 관리해야 한다. 초기 커버리지는 개선 대상을 찾기 위한 기준이며 통과율을 맞추기 위한 테스트 추가를 요구하지 않는다.

## 근거

- [Nest 테스트 모듈과 HTTP 테스트](https://docs.nestjs.com/fundamentals/testing)
- [Jest collectCoverageFrom](https://jestjs.io/docs/configuration#collectcoveragefrom-array)
- [Vitest V8 전체 소스 측정](https://vitest.dev/guide/coverage)
