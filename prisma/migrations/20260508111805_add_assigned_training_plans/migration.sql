-- AlterTable
ALTER TABLE "training_plans" ADD COLUMN     "assignedToUserId" INTEGER;

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
