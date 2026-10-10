ALTER TABLE "TripEvaluation"
  ADD COLUMN "weatherSnapshotId" TEXT,
  ADD COLUMN "routeSnapshotId" TEXT,
  ADD COLUMN "sunsetSnapshotId" TEXT;

CREATE INDEX "TripEvaluation_weatherSnapshotId_idx" ON "TripEvaluation"("weatherSnapshotId");
CREATE INDEX "TripEvaluation_routeSnapshotId_idx" ON "TripEvaluation"("routeSnapshotId");
CREATE INDEX "TripEvaluation_sunsetSnapshotId_idx" ON "TripEvaluation"("sunsetSnapshotId");

ALTER TABLE "TripEvaluation"
  ADD CONSTRAINT "TripEvaluation_weatherSnapshotId_fkey"
    FOREIGN KEY ("weatherSnapshotId") REFERENCES "WeatherSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "TripEvaluation_routeSnapshotId_fkey"
    FOREIGN KEY ("routeSnapshotId") REFERENCES "RouteSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "TripEvaluation_sunsetSnapshotId_fkey"
    FOREIGN KEY ("sunsetSnapshotId") REFERENCES "SunsetSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
