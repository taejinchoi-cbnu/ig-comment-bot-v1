CREATE TABLE "OAuthState" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "browserHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OAuthState_expiresAt_idx" ON "OAuthState"("expiresAt");
ALTER TABLE "OAuthState" ADD CONSTRAINT "OAuthState_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "OnboardingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
