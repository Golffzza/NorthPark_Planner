-- Saved AI itineraries may precede travel logistics. Existing rows retain their values.
ALTER TABLE "Trip"
  ALTER COLUMN "tripDate" DROP NOT NULL,
  ALTER COLUMN "departAt" DROP NOT NULL,
  ALTER COLUMN "originText" DROP NOT NULL,
  ALTER COLUMN "transportMode" DROP NOT NULL,
  ALTER COLUMN "travelerCount" DROP NOT NULL,
  ALTER COLUMN "weatherCondition" DROP NOT NULL,
  ALTER COLUMN "estimatedTravelMinutes" DROP NOT NULL;
