-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('NORTH');

-- CreateEnum
CREATE TYPE "AttractionType" AS ENUM ('VIEWPOINT', 'WATERFALL', 'TRAIL', 'CAMPSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "WarningSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('CAR', 'MOTORCYCLE', 'PUBLIC_TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'EVALUATED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EvaluationLevel" AS ENUM ('EXCELLENT', 'GOOD', 'MODERATE', 'NEEDS_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "WeatherCondition" AS ENUM ('CLEAR', 'CLOUDY', 'LIGHT_RAIN', 'HEAVY_RAIN', 'STORM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "lineUserId" TEXT,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Park" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "nameEn" TEXT,
    "province" TEXT NOT NULL,
    "region" "Region" NOT NULL DEFAULT 'NORTH',
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Park_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkAttraction" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "AttractionType" NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkAttraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkWarning" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "WarningSeverity" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkWarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "tripDate" TIMESTAMP(3) NOT NULL,
    "departAt" TEXT NOT NULL,
    "originText" TEXT NOT NULL,
    "originLat" DECIMAL(9,6),
    "originLng" DECIMAL(9,6),
    "transportMode" "TransportMode" NOT NULL,
    "travelerCount" INTEGER NOT NULL,
    "weatherCondition" "WeatherCondition" NOT NULL,
    "estimatedTravelMinutes" INTEGER NOT NULL,
    "mockSunsetTime" TEXT,
    "notes" TEXT,
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripEvaluation" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "level" "EvaluationLevel" NOT NULL,
    "weatherScore" INTEGER NOT NULL,
    "durationScore" INTEGER NOT NULL,
    "timeScore" INTEGER NOT NULL,
    "userProfileScore" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationRule" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_lineUserId_key" ON "User"("lineUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Park_slug_key" ON "Park"("slug");

-- CreateIndex
CREATE INDEX "Park_province_idx" ON "Park"("province");

-- CreateIndex
CREATE INDEX "Park_region_isActive_idx" ON "Park"("region", "isActive");

-- CreateIndex
CREATE INDEX "Park_isActive_createdAt_idx" ON "Park"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "ParkAttraction_parkId_idx" ON "ParkAttraction"("parkId");

-- CreateIndex
CREATE INDEX "ParkAttraction_parkId_type_idx" ON "ParkAttraction"("parkId", "type");

-- CreateIndex
CREATE INDEX "ParkWarning_parkId_idx" ON "ParkWarning"("parkId");

-- CreateIndex
CREATE INDEX "ParkWarning_parkId_isActive_idx" ON "ParkWarning"("parkId", "isActive");

-- CreateIndex
CREATE INDEX "ParkWarning_parkId_severity_idx" ON "ParkWarning"("parkId", "severity");

-- CreateIndex
CREATE INDEX "Trip_userId_idx" ON "Trip"("userId");

-- CreateIndex
CREATE INDEX "Trip_parkId_idx" ON "Trip"("parkId");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");

-- CreateIndex
CREATE INDEX "Trip_userId_createdAt_idx" ON "Trip"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Trip_userId_tripDate_idx" ON "Trip"("userId", "tripDate");

-- CreateIndex
CREATE INDEX "TripEvaluation_tripId_idx" ON "TripEvaluation"("tripId");

-- CreateIndex
CREATE INDEX "TripEvaluation_tripId_createdAt_idx" ON "TripEvaluation"("tripId", "createdAt");

-- CreateIndex
CREATE INDEX "TripEvaluation_level_idx" ON "TripEvaluation"("level");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationRule_key_key" ON "EvaluationRule"("key");

-- CreateIndex
CREATE INDEX "EvaluationRule_isActive_idx" ON "EvaluationRule"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- AddForeignKey
ALTER TABLE "ParkAttraction" ADD CONSTRAINT "ParkAttraction_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkWarning" ADD CONSTRAINT "ParkWarning_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripEvaluation" ADD CONSTRAINT "TripEvaluation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
