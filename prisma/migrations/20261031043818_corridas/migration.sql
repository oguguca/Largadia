-- CreateEnum
CREATE TYPE "RaceType" AS ENUM ('RUA', 'TRAIL', 'NOTURNA', 'TEMATICA', 'SOLIDARIA', 'KIDS');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('ABERTAS', 'EM_BREVE', 'ESGOTADAS', 'ENCERRADAS');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDENTE', 'APROVADA', 'RECUSADA');

-- CreateTable
CREATE TABLE "Race" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "city" TEXT NOT NULL,
    "citySlug" TEXT NOT NULL,
    "state" CHAR(2) NOT NULL,
    "venue" TEXT NOT NULL,
    "distancesKm" DOUBLE PRECISION[],
    "type" "RaceType" NOT NULL,
    "priceMinCents" INTEGER NOT NULL,
    "priceMaxCents" INTEGER NOT NULL,
    "registrationUrl" TEXT NOT NULL,
    "registrationStatus" "RegistrationStatus" NOT NULL,
    "registrationOpensAt" TIMESTAMP(3),
    "organizer" TEXT NOT NULL,
    "organizerEmail" TEXT,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'PENDENTE',
    "moderationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateIndex
CREATE UNIQUE INDEX "Race_slug_key" ON "Race"("slug");

-- CreateIndex
CREATE INDEX "Race_moderationStatus_startsAt_idx" ON "Race"("moderationStatus", "startsAt");

-- CreateIndex
CREATE INDEX "Race_citySlug_idx" ON "Race"("citySlug");

-- CreateIndex
CREATE INDEX "Race_state_idx" ON "Race"("state");
