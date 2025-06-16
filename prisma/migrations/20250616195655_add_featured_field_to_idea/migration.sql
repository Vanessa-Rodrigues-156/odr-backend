/*
  Warnings:

  - You are about to drop the column `userId` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `priorOdrExperience` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedAt` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedBy` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `views` on the `Idea` table. All the data in the column will be lost.
  - The primary key for the `IdeaCollaborator` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `IdeaMentor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `assignedAt` on the `IdeaMentor` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `MeetingLog` table. All the data in the column will be lost.
  - You are about to drop the column `jitsiRoomName` on the `MeetingLog` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `MeetingLog` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `MeetingLog` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `MeetingLog` table. All the data in the column will be lost.
  - You are about to drop the `MeetingNote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MeetingParticipant` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[ideaId,userId]` on the table `IdeaCollaborator` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ideaId,userId]` on the table `IdeaMentor` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `authorId` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `IdeaCollaborator` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `id` was added to the `IdeaMentor` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updatedAt` to the `IdeaMentor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `initiatorId` to the `MeetingLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roomName` to the `MeetingLog` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_userId_fkey";

-- DropForeignKey
ALTER TABLE "IdeaCollaborator" DROP CONSTRAINT "IdeaCollaborator_userId_fkey";

-- DropForeignKey
ALTER TABLE "IdeaMentor" DROP CONSTRAINT "IdeaMentor_userId_fkey";

-- DropForeignKey
ALTER TABLE "Like" DROP CONSTRAINT "Like_userId_fkey";

-- DropForeignKey
ALTER TABLE "MeetingLog" DROP CONSTRAINT "MeetingLog_createdById_fkey";

-- DropForeignKey
ALTER TABLE "MeetingLog" DROP CONSTRAINT "MeetingLog_ideaId_fkey";

-- DropForeignKey
ALTER TABLE "MeetingNote" DROP CONSTRAINT "MeetingNote_authorId_fkey";

-- DropForeignKey
ALTER TABLE "MeetingNote" DROP CONSTRAINT "MeetingNote_lastEditedById_fkey";

-- DropForeignKey
ALTER TABLE "MeetingNote" DROP CONSTRAINT "MeetingNote_meetingId_fkey";

-- DropForeignKey
ALTER TABLE "MeetingParticipant" DROP CONSTRAINT "MeetingParticipant_meetingId_fkey";

-- DropForeignKey
ALTER TABLE "MeetingParticipant" DROP CONSTRAINT "MeetingParticipant_userId_fkey";

-- DropIndex
DROP INDEX "MeetingLog_jitsiRoomName_key";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "userId",
ADD COLUMN     "authorId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Idea" DROP COLUMN "priorOdrExperience",
DROP COLUMN "reviewedAt",
DROP COLUMN "reviewedBy",
DROP COLUMN "views";

-- AlterTable
ALTER TABLE "IdeaCollaborator" DROP CONSTRAINT "IdeaCollaborator_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "IdeaCollaborator_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "IdeaMentor" DROP CONSTRAINT "IdeaMentor_pkey",
DROP COLUMN "assignedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "IdeaMentor_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "MeetingLog" DROP COLUMN "createdById",
DROP COLUMN "jitsiRoomName",
DROP COLUMN "status",
DROP COLUMN "summary",
DROP COLUMN "title",
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "initiatorId" TEXT NOT NULL,
ADD COLUMN     "meetingTitle" TEXT,
ADD COLUMN     "participants" INTEGER,
ADD COLUMN     "roomName" TEXT NOT NULL,
ADD COLUMN     "summaryText" TEXT,
ALTER COLUMN "startTime" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "ideaId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "userRole" DROP DEFAULT;

-- DropTable
DROP TABLE "MeetingNote";

-- DropTable
DROP TABLE "MeetingParticipant";

-- DropEnum
DROP TYPE "MeetingStatus";

-- CreateIndex
CREATE UNIQUE INDEX "IdeaCollaborator_ideaId_userId_key" ON "IdeaCollaborator"("ideaId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "IdeaMentor_ideaId_userId_key" ON "IdeaMentor"("ideaId", "userId");

-- AddForeignKey
ALTER TABLE "IdeaCollaborator" ADD CONSTRAINT "IdeaCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaMentor" ADD CONSTRAINT "IdeaMentor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingLog" ADD CONSTRAINT "MeetingLog_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
