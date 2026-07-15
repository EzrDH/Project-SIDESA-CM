-- AlterTable
ALTER TABLE "LetterRequest" ADD COLUMN     "number" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LetterRequest_number_key" ON "LetterRequest"("number");
