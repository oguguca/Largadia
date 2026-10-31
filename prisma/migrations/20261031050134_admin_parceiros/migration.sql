-- CreateEnum
CREATE TYPE "RaceSource" AS ENUM ('ORGANIZADOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "Race" ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "couponLabel" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "featuredOrder" INTEGER,
ADD COLUMN     "source" "RaceSource" NOT NULL DEFAULT 'ORGANIZADOR',
ADD COLUMN     "sourceUrl" TEXT;

-- CreateTable
CREATE TABLE "RaceClick" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaceClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RaceClick_raceId_createdAt_idx" ON "RaceClick"("raceId", "createdAt");

-- CreateIndex
CREATE INDEX "RaceClick_platform_createdAt_idx" ON "RaceClick"("platform", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Race_featured_idx" ON "Race"("featured");

-- AddForeignKey
ALTER TABLE "RaceClick" ADD CONSTRAINT "RaceClick_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;
