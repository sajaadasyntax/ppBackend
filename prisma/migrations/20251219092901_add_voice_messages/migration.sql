-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MessageType') THEN
    CREATE TYPE "MessageType" AS ENUM ('TEXT', 'VOICE', 'IMAGE');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeletionEntityType') THEN
    CREATE TYPE "DeletionEntityType" AS ENUM ('REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT');
  END IF;
END $$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeletionRequestStatus') THEN
    CREATE TYPE "DeletionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

-- AlterTable
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ChatMessage' AND column_name = 'duration') THEN
    ALTER TABLE "ChatMessage" ADD COLUMN "duration" INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ChatMessage' AND column_name = 'mediaUrl') THEN
    ALTER TABLE "ChatMessage" ADD COLUMN "mediaUrl" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ChatMessage' AND column_name = 'messageType') THEN
    ALTER TABLE "ChatMessage" ADD COLUMN "messageType" "MessageType" NOT NULL DEFAULT 'TEXT';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ChatMessage' AND column_name = 'text' AND is_nullable = 'NO') THEN
    ALTER TABLE "ChatMessage" ALTER COLUMN "text" DROP NOT NULL;
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "DeletionRequest" (
    "id" TEXT NOT NULL,
    "entityType" "DeletionEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "actionDate" TIMESTAMP(3),
    "requestedById" TEXT NOT NULL,
    "actionById" TEXT,

    CONSTRAINT "DeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DeletionRequest_status_idx" ON "DeletionRequest"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DeletionRequest_requestedById_idx" ON "DeletionRequest"("requestedById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DeletionRequest_createdAt_idx" ON "DeletionRequest"("createdAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DeletionRequest_requestedById_fkey'
  ) THEN
    ALTER TABLE "DeletionRequest" ADD CONSTRAINT "DeletionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DeletionRequest_actionById_fkey'
  ) THEN
    ALTER TABLE "DeletionRequest" ADD CONSTRAINT "DeletionRequest_actionById_fkey" FOREIGN KEY ("actionById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
