-- CreateTable
CREATE TABLE "RunLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "raceId" TEXT,
    "customRaceName" TEXT,
    "customCity" TEXT,
    "customState" CHAR(2),
    "raceDate" TIMESTAMP(3) NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "finishSeconds" INTEGER,
    "rating" INTEGER,
    "ratingCourse" INTEGER,
    "ratingOrganization" INTEGER,
    "ratingKit" INTEGER,
    "ratingHydration" INTEGER,
    "comment" TEXT,
    "hiddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RunLog_userId_raceDate_idx" ON "RunLog"("userId", "raceDate");

-- CreateIndex
CREATE INDEX "RunLog_raceId_rating_idx" ON "RunLog"("raceId", "rating");

-- CreateIndex
CREATE INDEX "RunLog_createdAt_idx" ON "RunLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RunLog_userId_raceId_key" ON "RunLog"("userId", "raceId");

-- AddForeignKey
ALTER TABLE "RunLog" ADD CONSTRAINT "RunLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunLog" ADD CONSTRAINT "RunLog_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Notas sempre de 1 a 5
ALTER TABLE "RunLog" ADD CONSTRAINT "RunLog_ratings_check" CHECK (
  ("rating" IS NULL OR "rating" BETWEEN 1 AND 5) AND
  ("ratingCourse" IS NULL OR "ratingCourse" BETWEEN 1 AND 5) AND
  ("ratingOrganization" IS NULL OR "ratingOrganization" BETWEEN 1 AND 5) AND
  ("ratingKit" IS NULL OR "ratingKit" BETWEEN 1 AND 5) AND
  ("ratingHydration" IS NULL OR "ratingHydration" BETWEEN 1 AND 5)
);

-- Comprovações já aprovadas entram na estante de quem correu
INSERT INTO "RunLog" ("id", "userId", "raceId", "customRaceName", "customCity", "customState", "raceDate", "distanceKm", "finishSeconds", "createdAt", "updatedAt")
SELECT 'c' || substr(md5(c."id"), 1, 24), c."userId", c."raceId", c."customRaceName", c."customCity", c."customState",
       COALESCE(c."raceDate", c."customRaceDate", c."createdAt"), c."distanceKm", c."finishSeconds", c."createdAt", CURRENT_TIMESTAMP
FROM "PointClaim" c
WHERE c."status" = 'APROVADA'
ON CONFLICT DO NOTHING;
