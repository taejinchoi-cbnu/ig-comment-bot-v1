# ig-comment-bot

인스타그램 게시물에 키워드 댓글이 달리면 자동으로 DM을 보내주는 서비스

## 현재 상태

- Phase 1 백엔드는 webhook 수신부터 Instagram API 발송까지 구현되었습니다.
- Phase 2는 가입 요청, 초대 대기 화면, 운영용 인증 API 및 Instagram OAuth 연결 흐름까지 구현되었습니다.
- 게시글 설정, 활동 대시보드와 CloudFront/S3 배포는 아직 구현되지 않았습니다.
- 공개본은 로컬 검증을 대상으로 하며, 이 저장소의 변경을 운영 환경에 배포하지 않았습니다.

## 실행

테스트 도구의 요구 조건에 맞춰 Node.js 24.15 이상과 pnpm 10.5.2를 사용합니다. 설치 시 Prisma 클라이언트 생성은 운영 설정이나 DB 연결 없이 수행됩니다. 로컬 서버 실행에는 `ops.example/`을 참고한 별도 운영 설정이 필요합니다.

```bash
pnpm install
pnpm typecheck        # tsc --noEmit
pnpm test             # Jest(API) + Vitest(웹·공유)
pnpm test:coverage    # 패키지별 전체 src 커버리지 리포트
pnpm verify          # 타입 검사 + 커버리지 테스트 + 빌드
pnpm verify:public   # 추적 파일의 공개 경계 및 기본 secret 패턴 검사
pnpm -F api dev       # 로컬 API 서버 (:3000)
```

배포(`scripts/deploy.sh`)는 AWS 자격 증명과 `ops/deploy.env`(gitignore 대상, 운영자 전용)가 있어야 동작합니다.
SAM CLI는 설치하지 않고 `aws cloudformation deploy --capabilities CAPABILITY_AUTO_EXPAND`로 SAM transform을 서버 측에서 처리합니다.

## 테스트

기본 테스트는 운영 환경 파일이나 실제 DB·AWS·Instagram을 사용하지 않습니다. API는 Jest + ts-jest + Nest 테스트 앱/Supertest, 웹은 Vitest + React Testing Library, 공유 패키지는 Vitest의 Node 환경을 사용합니다. 테스트·설정 파일도 타입 검사에 포함합니다.

각 패키지에서 `test`, `test:watch`, `test:coverage`를 실행할 수 있습니다. 커버리지는 전체 `src`를 측정하며 테스트·지원 파일·타입 선언·Prisma 생성 코드는 제외합니다. 최소 통과율은 설정하지 않습니다. 구문·분기·함수·줄 결과는 터미널에 표시되고 `apps/api/coverage/`, `apps/web/coverage/`, `packages/shared/coverage/`에 HTML(`index.html`), LCOV(`lcov.info`), JSON 요약(`coverage-summary.json`)이 생성됩니다. 산출물은 Git에서 제외합니다.

실제 PostgreSQL 멱등성 검증은 별도 테스트 DB를 준비하고 `TEST_DATABASE_URL`을 환경변수 또는 파일로 제공한 뒤 `pnpm -F @ig/api test:db`로 실행합니다. 운영 DB를 지정하지 않습니다. 연결 문자열을 CLI 인자로 전달하지 않습니다. 설정이 없으면 DB 연결 전에 실패하며, 실행 후 테스트 데이터와 연결을 정리합니다.

도구 선택과 커버리지 정책은 [ADR 0004](docs/adr/0004-test-runners-and-coverage.md)에 기록했습니다.

## 문서

- [`SECURITY.md`](SECURITY.md) — 공개본 검증과 운영 과제
- [`docs/`](docs/README.md) — 설계, API 제약과 구현 단계
- [`study/`](study/) — 판단 과정을 기록한 회고 (PAAR 구조)

라이선스: [CC BY-NC 4.0](LICENSE) — 상업적 사용만 제한.

## 공개본의 보안·개인정보 처리

수신 댓글의 키워드는 webhook 메모리에서 판정합니다. SQS에는 버전 1 메타데이터와 댓글의 `triggerMatched`만 전달하며, 수신 댓글·DM 본문은 DB·큐·로그에 저장하지 않습니다. 키워드 판정은 수신 시점, 활성 상태와 발송 문구는 worker 처리 시점의 설정을 사용합니다.

개인정보 안내의 연락처는 `PRIVACY_CONTACT_EMAIL`로 설정합니다. 설정이 없으면 `/privacy`와 `/data-deletion`은 503을 반환합니다. 배포 스크립트도 연락처 설정을 요구합니다. 실제 개인정보처리방침의 보관·삭제 절차는 운영자가 배포 환경과 맞춰 관리해야 합니다.

새 큐 형식은 구버전과 호환되지 않습니다. 운영 갱신 시 수신을 잠시 중단하고 기존 큐와 DLQ의 메시지를 처리·정리한 뒤 receiver와 worker를 함께 갱신합니다. 기존 본문 포함 메시지는 새 형식으로 재전송하지 않습니다.

로그 보관은 인프라 기준 7일, 큐와 DLQ의 최대 보관은 4일입니다. 요청 빈도 제한 및 데이터 자동 삭제·보관 정책의 구현 확대는 후속 과제입니다. 이 공개 준비 작업은 실제 운영 DB·AWS 설정이나 운영 환경의 안전성을 검증한 배포가 아닙니다.
