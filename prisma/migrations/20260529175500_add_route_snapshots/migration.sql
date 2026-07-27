-- Expand-first Phase 2 route and distance foundation.
-- Keep existing Trip, TripEvaluation, WeatherSnapshot, and SunsetSnapshot data intact.

CREATE TABLE "RouteSnapshot" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "originLat" DECIMAL(9,6) NOT NULL,
    "originLng" DECIMAL(9,6) NOT NULL,
    "destinationLat" DECIMAL(9,6) NOT NULL,
    "destinationLng" DECIMAL(9,6) NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "geometryJson" JSONB,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RouteSnapshot_tripId_idx" ON "RouteSnapshot"("tripId");
CREATE INDEX "RouteSnapshot_tripId_createdAt_idx" ON "RouteSnapshot"("tripId", "createdAt");

ALTER TABLE "RouteSnapshot"
ADD CONSTRAINT "RouteSnapshot_tripId_fkey"
FOREIGN KEY ("tripId") REFERENCES "Trip"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
