-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "training_plans" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "PlanStatus" NOT NULL DEFAULT 'pending',
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_plans_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
