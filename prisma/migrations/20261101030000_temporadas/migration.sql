-- AlterTable
ALTER TABLE "PointClaim" ADD COLUMN     "raceDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PointClaim_status_raceDate_idx" ON "PointClaim"("status", "raceDate");


-- Dia da prova nas comprovações já enviadas
UPDATE "PointClaim" pc SET "raceDate" = r."startsAt" FROM "Race" r WHERE pc."raceId" = r."id";
UPDATE "PointClaim" SET "raceDate" = "customRaceDate" WHERE "raceId" IS NULL;

-- Regra nova: 5 pontos por prova + 1 por km
UPDATE "PointClaim" SET "points" = 5 + ROUND("distanceKm")::int;
