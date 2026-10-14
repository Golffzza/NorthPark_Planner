ALTER TABLE "Trip" ADD COLUMN "aiDraftId" TEXT;
CREATE UNIQUE INDEX "Trip_aiDraftId_key" ON "Trip"("aiDraftId");

CREATE TABLE "TripItineraryDay" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "dayNumber" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  CONSTRAINT "TripItineraryDay_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TripItineraryDay_tripId_dayNumber_key" ON "TripItineraryDay"("tripId", "dayNumber");
CREATE INDEX "TripItineraryDay_tripId_idx" ON "TripItineraryDay"("tripId");
ALTER TABLE "TripItineraryDay" ADD CONSTRAINT "TripItineraryDay_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TripItineraryItem" (
  "id" TEXT NOT NULL,
  "dayId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "sourceReference" TEXT,
  "notes" TEXT,
  CONSTRAINT "TripItineraryItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TripItineraryItem_dayId_position_key" ON "TripItineraryItem"("dayId", "position");
CREATE INDEX "TripItineraryItem_dayId_idx" ON "TripItineraryItem"("dayId");
ALTER TABLE "TripItineraryItem" ADD CONSTRAINT "TripItineraryItem_dayId_fkey"
  FOREIGN KEY ("dayId") REFERENCES "TripItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
