-- AlterTable
ALTER TABLE "LineAccount" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TripEvaluation" ADD COLUMN     "canProceed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "constraints" JSONB,
ADD COLUMN     "factors" JSONB;
