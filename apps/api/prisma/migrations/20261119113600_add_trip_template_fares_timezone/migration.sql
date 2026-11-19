-- AlterTable
ALTER TABLE "trip_templates" ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';

-- CreateTable
CREATE TABLE "trip_template_fares" (
    "id" UUID NOT NULL,
    "tripTemplateId" UUID NOT NULL,
    "fromStopIndex" INTEGER NOT NULL,
    "toStopIndex" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "seatType" "SeatType",
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_template_fares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_template_fares_tripTemplateId_fromStopIndex_toStopInde_idx" ON "trip_template_fares"("tripTemplateId", "fromStopIndex", "toStopIndex");

-- CreateIndex
CREATE UNIQUE INDEX "trip_template_fares_tripTemplateId_fromStopIndex_toStopInde_key" ON "trip_template_fares"("tripTemplateId", "fromStopIndex", "toStopIndex", "seatType");

-- AddForeignKey
ALTER TABLE "trip_template_fares" ADD CONSTRAINT "trip_template_fares_tripTemplateId_fkey" FOREIGN KEY ("tripTemplateId") REFERENCES "trip_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
