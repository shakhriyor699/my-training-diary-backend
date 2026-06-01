-- CreateEnum
CREATE TYPE "UserApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "approvalStatus" "UserApprovalStatus",
ADD COLUMN "rejectionReason" TEXT;

-- Existing users should keep access after migration.
UPDATE "users"
SET "approvalStatus" = 'approved'
WHERE "approvalStatus" IS NULL;

-- AlterTable
ALTER TABLE "users"
ALTER COLUMN "approvalStatus" SET NOT NULL,
ALTER COLUMN "approvalStatus" SET DEFAULT 'pending';
