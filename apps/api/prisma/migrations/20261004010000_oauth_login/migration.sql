CREATE TYPE "OAuthPurpose" AS ENUM ('CONNECT', 'LOGIN');
ALTER TABLE "OAuthState" ADD COLUMN "purpose" "OAuthPurpose" NOT NULL DEFAULT 'CONNECT';
ALTER TABLE "OAuthState" ALTER COLUMN "requestId" DROP NOT NULL;
ALTER TABLE "OAuthState" ADD CONSTRAINT "OAuthState_purpose_request_check"
  CHECK (("purpose" = 'CONNECT' AND "requestId" IS NOT NULL)
      OR ("purpose" = 'LOGIN' AND "requestId" IS NULL));
