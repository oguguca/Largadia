-- CreateTable
CREATE TABLE "PixPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PixPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PixPayment_userId_createdAt_idx" ON "PixPayment"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PixPayment" ADD CONSTRAINT "PixPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

