-- Expand-first Phase 2 weather and sunset foundation.
-- Keep existing Trip and TripEvaluation data intact while adding snapshot history tables.

CREATE TABLE "WeatherSnapshot" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "forecastAt" TIMESTAMP(3) NOT NULL,
    "weatherCode" INTEGER NOT NULL,
    "precipitationMm" DOUBLE PRECISION,
    "weatherCondition" "WeatherCondition" NOT NULL,
    "temperatureC" DOUBLE PRECISION,
    "windSpeedKmh" DOUBLE PRECISION,
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SunsetSnapshot" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "sunsetAt" TIMESTAMP(3) NOT NULL,
    "sunsetLocalTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SunsetSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WeatherSnapshot_tripId_idx" ON "WeatherSnapshot"("tripId");
CREATE INDEX "WeatherSnapshot_tripId_createdAt_idx" ON "WeatherSnapshot"("tripId", "createdAt");
CREATE INDEX "WeatherSnapshot_weatherCondition_idx" ON "WeatherSnapshot"("weatherCondition");

CREATE INDEX "SunsetSnapshot_tripId_idx" ON "SunsetSnapshot"("tripId");
CREATE INDEX "SunsetSnapshot_tripId_createdAt_idx" ON "SunsetSnapshot"("tripId", "createdAt");

ALTER TABLE "WeatherSnapshot"
ADD CONSTRAINT "WeatherSnapshot_tripId_fkey"
FOREIGN KEY ("tripId") REFERENCES "Trip"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SunsetSnapshot"
ADD CONSTRAINT "SunsetSnapshot_tripId_fkey"
FOREIGN KEY ("tripId") REFERENCES "Trip"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
