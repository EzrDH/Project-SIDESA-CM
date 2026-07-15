-- CreateEnum
CREATE TYPE "LetterType" AS ENUM ('SURAT_PENGANTAR', 'SKTM', 'DOMISILI');

-- CreateEnum
CREATE TYPE "LetterStatus" AS ENUM ('SUBMITTED', 'DRAFTED', 'SIGNED', 'REJECTED');

-- CreateTable
CREATE TABLE "LetterRequest" (
    "id" TEXT NOT NULL,
    "wargaAccountId" TEXT NOT NULL,
    "type" "LetterType" NOT NULL,
    "formData" TEXT NOT NULL,
    "status" "LetterStatus" NOT NULL DEFAULT 'SUBMITTED',
    "draftContent" TEXT,
    "draftNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LetterRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Letter" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "letterNumber" TEXT NOT NULL,
    "canonicalContent" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "kadesAccountId" TEXT NOT NULL,
    "kadesPublicKey" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Letter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Letter_requestId_key" ON "Letter"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Letter_letterNumber_key" ON "Letter"("letterNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Letter_qrToken_key" ON "Letter"("qrToken");

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LetterRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
