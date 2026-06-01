-- CreateEnum
CREATE TYPE "CoachRequestStatus" AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'coach';

-- CreateTable
CREATE TABLE "coach_requests" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "coachId" INTEGER NOT NULL,
    "status" "CoachRequestStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coach_requests_studentId_coachId_key" ON "coach_requests"("studentId", "coachId");

-- AddForeignKey
ALTER TABLE "coach_requests" ADD CONSTRAINT "coach_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_requests" ADD CONSTRAINT "coach_requests_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
