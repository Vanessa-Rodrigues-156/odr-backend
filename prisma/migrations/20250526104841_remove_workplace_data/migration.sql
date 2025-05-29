/*
  Warnings:

  - You are about to drop the column `likes` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `likes` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `workplaceData` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `userType` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `IdeaSubmission` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `ownerId` to the `Idea` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('INNOVATOR', 'MENTOR', 'ADMIN', 'OTHER');

-- DropForeignKey
ALTER TABLE "Idea" DROP CONSTRAINT "Idea_userId_fkey";

-- DropForeignKey
ALTER TABLE "IdeaSubmission" DROP CONSTRAINT "IdeaSubmission_ideaId_fkey";

-- DropForeignKey
ALTER TABLE "IdeaSubmission" DROP CONSTRAINT "IdeaSubmission_userId_fkey";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "likes";

-- AlterTable
ALTER TABLE "Idea" DROP COLUMN "likes",
DROP COLUMN "userId",
DROP COLUMN "workplaceData",
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "priorOdrExperience" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
DROP COLUMN "userType",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactNumber" TEXT,
ADD COLUMN     "highestEducation" TEXT,
ADD COLUMN     "odrLabUsage" TEXT,
ADD COLUMN     "userRole" "UserRole" NOT NULL DEFAULT 'INNOVATOR';

-- DropTable
DROP TABLE "IdeaSubmission";

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "IdeaCollaborator" (
    "userId" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaCollaborator_pkey" PRIMARY KEY ("userId","ideaId")
);

-- CreateTable
CREATE TABLE "IdeaMentor" (
    "userId" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaMentor_pkey" PRIMARY KEY ("userId","ideaId")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "ideaId" TEXT,
    "commentId" TEXT,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_ideaId_key" ON "Like"("userId", "ideaId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_userId_commentId_key" ON "Like"("userId", "commentId");

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaCollaborator" ADD CONSTRAINT "IdeaCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaCollaborator" ADD CONSTRAINT "IdeaCollaborator_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaMentor" ADD CONSTRAINT "IdeaMentor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaMentor" ADD CONSTRAINT "IdeaMentor_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
