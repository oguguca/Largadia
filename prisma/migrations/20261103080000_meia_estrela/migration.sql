-- AlterTable
ALTER TABLE "RunLog" ALTER COLUMN "rating" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "ratingCourse" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "ratingOrganization" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "ratingKit" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "ratingHydration" SET DATA TYPE DOUBLE PRECISION;


-- Notas de 0,5 a 5, de meia em meia
ALTER TABLE "RunLog" DROP CONSTRAINT "RunLog_ratings_check";
ALTER TABLE "RunLog" ADD CONSTRAINT "RunLog_ratings_check" CHECK (
  ("rating" IS NULL OR ("rating" BETWEEN 0.5 AND 5 AND "rating" * 2 = floor("rating" * 2))) AND
  ("ratingCourse" IS NULL OR ("ratingCourse" BETWEEN 0.5 AND 5 AND "ratingCourse" * 2 = floor("ratingCourse" * 2))) AND
  ("ratingOrganization" IS NULL OR ("ratingOrganization" BETWEEN 0.5 AND 5 AND "ratingOrganization" * 2 = floor("ratingOrganization" * 2))) AND
  ("ratingKit" IS NULL OR ("ratingKit" BETWEEN 0.5 AND 5 AND "ratingKit" * 2 = floor("ratingKit" * 2))) AND
  ("ratingHydration" IS NULL OR ("ratingHydration" BETWEEN 0.5 AND 5 AND "ratingHydration" * 2 = floor("ratingHydration" * 2)))
);
