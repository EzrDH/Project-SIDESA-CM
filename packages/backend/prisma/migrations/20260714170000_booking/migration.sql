-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'CHECKED_IN');

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "wargaAccountId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "requestedSlot" TIMESTAMP(3) NOT NULL,
    "confirmedSlot" TIMESTAMP(3),
    "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "checkinToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_checkinToken_key" ON "Booking"("checkinToken");
