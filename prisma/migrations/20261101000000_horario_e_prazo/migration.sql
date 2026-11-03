-- AlterTable
ALTER TABLE "Race" ADD COLUMN     "registrationClosesAt" TIMESTAMP(3),
ADD COLUMN     "timeKnown" BOOLEAN NOT NULL DEFAULT true;


-- Provas importadas do calendário vieram sem horário
UPDATE "Race" SET "timeKnown" = false WHERE "externalId" IS NOT NULL;
