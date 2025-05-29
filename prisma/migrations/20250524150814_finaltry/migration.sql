/*
  Warnings:

  - You are about to drop the column `author` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `authorRole` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `submitterEmail` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `submitterLocation` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `submitterName` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `IdeaSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `course` on the `IdeaSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `IdeaSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `institution` on the `IdeaSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `IdeaSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `IdeaSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `IdeaSubmission` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Idea` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `IdeaSubmission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "author",
DROP COLUMN "authorRole",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Idea" DROP COLUMN "submitterEmail",
DROP COLUMN "submitterLocation",
DROP COLUMN "submitterName",
ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "IdeaSubmission" DROP COLUMN "address",
DROP COLUMN "course",
DROP COLUMN "email",
DROP COLUMN "institution",
DROP COLUMN "name",
DROP COLUMN "phone",
DROP COLUMN "role",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "country" TEXT,
ADD COLUMN     "institution" TEXT,
ADD COLUMN     "userType" TEXT;

-- AddForeignKey
ALTER TABLE "IdeaSubmission" ADD CONSTRAINT "IdeaSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
