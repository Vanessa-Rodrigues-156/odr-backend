/*
  Warnings:

  - You are about to drop the column `country` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Idea` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Idea` table. All the data in the column will be lost.
  - Added the required column `submitterEmail` to the `Idea` table without a default value. This is not possible if the table is not empty.
  - Added the required column `submitterName` to the `Idea` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Idea` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Idea` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `IdeaSubmission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Idea" DROP COLUMN "country",
DROP COLUMN "email",
DROP COLUMN "name",
ADD COLUMN     "caption" TEXT,
ADD COLUMN     "submitterEmail" TEXT NOT NULL,
ADD COLUMN     "submitterLocation" TEXT,
ADD COLUMN     "submitterName" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "IdeaSubmission" ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "IdeaSubmission" ADD CONSTRAINT "IdeaSubmission_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
