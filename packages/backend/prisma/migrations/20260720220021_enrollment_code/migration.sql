-- CreateTable
CREATE TABLE "EnrollmentCode" (
    "codeHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "nikCommitment" TEXT NOT NULL,
    "attributes" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "accountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnrollmentCode_pkey" PRIMARY KEY ("codeHash")
);

