/*
  Warnings:

  - You are about to drop the column `college_id` on the `ai_chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `ai_chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `session_id` on the `ai_chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `ai_chat_messages` table. All the data in the column will be lost.
  - You are about to drop the column `college_id` on the `document_embeddings` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `document_embeddings` table. All the data in the column will be lost.
  - You are about to drop the column `source_id` on the `document_embeddings` table. All the data in the column will be lost.
  - You are about to drop the column `source_type` on the `document_embeddings` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `document_embeddings` table. All the data in the column will be lost.
  - Added the required column `collegeId` to the `ai_chat_messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionId` to the `ai_chat_messages` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `ai_chat_messages` table without a default value. This is not possible if the table is not empty.
  - Made the column `sources` on table `ai_chat_messages` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `collegeId` to the `document_embeddings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceType` to the `document_embeddings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `document_embeddings` table without a default value. This is not possible if the table is not empty.
  - Made the column `metadata` on table `document_embeddings` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ai_chat_messages" DROP CONSTRAINT "ai_chat_messages_college_id_fkey";

-- DropForeignKey
ALTER TABLE "ai_chat_messages" DROP CONSTRAINT "ai_chat_messages_user_id_fkey";

-- DropForeignKey
ALTER TABLE "document_embeddings" DROP CONSTRAINT "document_embeddings_college_id_fkey";

-- DropIndex
DROP INDEX "idx_chat_session";

-- DropIndex
DROP INDEX "idx_chat_user";

-- DropIndex
DROP INDEX "idx_embeddings_college";

-- DropIndex
DROP INDEX "idx_embeddings_source";

-- DropIndex
DROP INDEX "idx_embeddings_vector";

-- AlterTable
ALTER TABLE "ai_chat_messages" DROP COLUMN "college_id",
DROP COLUMN "created_at",
DROP COLUMN "session_id",
DROP COLUMN "user_id",
ADD COLUMN     "collegeId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sessionId" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "sources" SET NOT NULL;

-- AlterTable
ALTER TABLE "document_embeddings" DROP COLUMN "college_id",
DROP COLUMN "created_at",
DROP COLUMN "source_id",
DROP COLUMN "source_type",
DROP COLUMN "updated_at",
ADD COLUMN     "collegeId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceType" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "metadata" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ai_chat_messages_sessionId_createdAt_idx" ON "ai_chat_messages"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_chat_messages_userId_createdAt_idx" ON "ai_chat_messages"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "document_embeddings_collegeId_idx" ON "document_embeddings"("collegeId");

-- CreateIndex
CREATE INDEX "document_embeddings_sourceType_sourceId_idx" ON "document_embeddings"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "document_embeddings" ADD CONSTRAINT "document_embeddings_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
