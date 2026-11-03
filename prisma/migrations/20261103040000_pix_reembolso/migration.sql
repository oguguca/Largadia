-- AlterTable
ALTER TABLE "PixPayment" ADD COLUMN     "paymentIntentId" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "PixPayment_paymentIntentId_key" ON "PixPayment"("paymentIntentId");
