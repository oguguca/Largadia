-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDENTE', 'APROVADA', 'RECUSADA');

-- CreateTable
CREATE TABLE "PointClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "proofUrl" TEXT NOT NULL,
    "bibNumber" TEXT,
    "points" INTEGER NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDENTE',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointClaim_status_createdAt_idx" ON "PointClaim"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PointClaim_userId_raceId_key" ON "PointClaim"("userId", "raceId");

-- AddForeignKey
ALTER TABLE "PointClaim" ADD CONSTRAINT "PointClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointClaim" ADD CONSTRAINT "PointClaim_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

