-- AlterTable
ALTER TABLE "training_plans" ADD COLUMN     "deloadAfterWeeks" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "deloadPercent" INTEGER NOT NULL DEFAULT 10;
