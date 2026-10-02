# ADR-0002: React/Vite/Emotion과 REST 기반 서버 상태 관리를 사용한다

- 상태: Accepted
- 결정일: 2026-09-20

## 맥락

화면은 가입·연결, 자동 DM 목록/편집, 활동 피드가 전부다. 대부분의 상태는 서버에 있고,
로컬 전역 상태나 임의 필드 선택이 필요한 복수 클라이언트가 없다. 디자인 레퍼런스는
모바일 앱 같은 카드·고정 액션·단계 화면을 요구한다.

## 결정

- React 19 + TypeScript + Vite
- Emotion(`@emotion/react`, `@emotion/styled`)으로 theme과 컴포넌트 스타일 구성
- React Router로 공개/인증/온보딩/대시보드 경로 분리
- TanStack Query로 계정 상태, 자동 DM, 활동 내역, mutation과 재조회 관리
- React Hook Form + Zod로 폼과 검증 관리. API DTO/스키마는 `packages/shared`에서 공유
- REST API를 유지하고 공통 `fetch` 래퍼만 둔다. Axios는 추가하지 않는다.
- Zustand와 GraphQL은 도입하지 않는다.

## 상태 소유권

| 상태 | 소유자 |
|---|---|
| 서버 데이터·로딩·재시도 | TanStack Query |
| 폼 입력·오류 | React Hook Form + Zod |
| 화면·callback 경로 | React Router |
| 모달·접힘·선택 | 컴포넌트 `useState` |
| 로그인 사용자 | `/api/auth/me` Query |
| 색상·간격·타이포 | Emotion Theme |

## 결과

Zustand가 해결할 별도 전역 클라이언트 상태가 생길 때까지 추가하지 않는다. GraphQL은 여러
클라이언트가 각자 다른 데이터 모양을 요구할 때만 재검토한다. Phase 3 집계도 목적별 REST
응답으로 제공한다.
