-- AlterTable
ALTER TABLE "PointClaim" ADD COLUMN     "customCity" TEXT,
ADD COLUMN     "customRaceDate" TIMESTAMP(3),
ADD COLUMN     "customRaceName" TEXT,
ADD COLUMN     "customState" CHAR(2),
ALTER COLUMN "raceId" DROP NOT NULL;

