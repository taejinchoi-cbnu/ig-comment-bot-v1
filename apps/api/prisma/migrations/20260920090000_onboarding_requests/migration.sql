-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('REQUESTED', 'INVITED', 'AUTHORIZING', 'CONNECTED', 'ERROR');

-- CreateTable
CREATE TABLE "OnboardingRequest" (
    "id" TEXT NOT NULL,
    "instagramUsername" TEXT NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'REQUESTED',
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OnboardingRequest_status_createdAt_idx" ON "OnboardingRequest"("status", "createdAt");
