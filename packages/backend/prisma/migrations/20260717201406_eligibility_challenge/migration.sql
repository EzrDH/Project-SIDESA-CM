-- CreateTable
CREATE TABLE "EligibilityChallenge" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EligibilityChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EligibilityChallenge_nonce_key" ON "EligibilityChallenge"("nonce");

-- AddForeignKey
ALTER TABLE "EligibilityChallenge" ADD CONSTRAINT "EligibilityChallenge_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

