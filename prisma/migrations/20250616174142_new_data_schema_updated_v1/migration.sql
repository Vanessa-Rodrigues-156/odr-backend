/*
  Warnings:

  - You are about to drop the column `highestEducation` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `institution` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `odrLabUsage` on the `User` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MentorType" AS ENUM ('TECHNICAL_EXPERT', 'LEGAL_EXPERT', 'ODR_EXPERT', 'CONFLICT_RESOLUTION_EXPERT');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'FACULTY';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "highestEducation",
DROP COLUMN "institution",
DROP COLUMN "odrLabUsage",
ADD COLUMN     "imageAvatar" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Innovator" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institution" TEXT,
    "highestEducation" TEXT,
    "courseName" TEXT,
    "courseStatus" TEXT,
    "description" TEXT,

    CONSTRAINT "Innovator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mentor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mentorType" "MentorType" NOT NULL,
    "organization" TEXT,
    "role" TEXT,
    "expertise" TEXT,
    "description" TEXT,

    CONSTRAINT "Mentor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faculty" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institution" TEXT,
    "role" TEXT,
    "expertise" TEXT,
    "course" TEXT,
    "mentoring" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Other" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT,
    "workplace" TEXT,
    "description" TEXT,

    CONSTRAINT "Other_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Innovator_userId_key" ON "Innovator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Mentor_userId_key" ON "Mentor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_userId_key" ON "Faculty"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Other_userId_key" ON "Other"("userId");

-- AddForeignKey
ALTER TABLE "Innovator" ADD CONSTRAINT "Innovator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mentor" ADD CONSTRAINT "Mentor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Other" ADD CONSTRAINT "Other_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
