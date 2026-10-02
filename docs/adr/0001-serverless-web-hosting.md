# ADR-0001: S3 + CloudFront + Lambda로 웹을 운영한다

- 상태: Accepted
- 결정일: 2026-09-20

## 맥락

웹은 React SPA이고 API는 이미 NestJS Lambda Function URL로 배포된다. 상시 실행 프로세스,
서버 렌더링, WebSocket이 없으므로 EC2를 둘 이유가 없다. 같은 도메인에서 SPA, API, OAuth
callback, Meta webhook을 제공해 CORS와 운영 지점을 줄여야 한다.

## 결정

- Vite 산출물은 비공개 S3 버킷에 저장하고 CloudFront OAC로만 읽는다.
- CloudFront 기본 오리진은 S3, `/api/*`, `/oauth/*`, `/webhook/*`는 Lambda Function URL이다.
- 정적 해시 자산은 장기 캐시하고 `index.html`은 짧게 캐시한다. API 동작은 캐시하지 않는다.
- SPA fallback은 CloudFront Function이 **화면 경로만** `/index.html`로 rewrite한다. API의
  401/403/404를 HTML 200으로 바꾸는 전역 custom error response는 쓰지 않는다.
- Lambda Function URL은 Meta webhook POST와 브라우저 요청을 함께 받으므로 `AuthType: NONE`을
  유지한다. 앱 API는 세션/JWT, webhook은 HMAC으로 인증한다.
- EC2, ALB, VPC, NAT Gateway, Lambda@Edge는 도입하지 않는다.

## 결과

정적 화면은 서버 실행 비용 없이 배포되고 API만 요청 시 Lambda가 실행된다. CloudFront 한
도메인 아래에서 OAuth callback과 쿠키 인증을 사용할 수 있다. SSR이 필요한 요구가 생기면
별도 ADR로 다시 판단한다.
