-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "attributes" TEXT,
ADD COLUMN     "leafIndex" INTEGER;

-- CreateTable
CREATE TABLE "RegistryVersion" (
    "id" TEXT NOT NULL,
    "version" SERIAL NOT NULL,
    "root" TEXT NOT NULL,
    "signature" TEXT,
    "signedBy" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistryVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistryVersion_version_key" ON "RegistryVersion"("version");

-- CreateIndex
CREATE UNIQUE INDEX "Account_leafIndex_key" ON "Account"("leafIndex");
