-- AlterTable
ALTER TABLE "Race" ADD COLUMN     "priceKnown" BOOLEAN NOT NULL DEFAULT true;


-- Provas já importadas do calendário vieram sem preço
UPDATE "Race" SET "priceKnown" = false WHERE "externalId" IS NOT NULL AND "priceMaxCents" = 0;
