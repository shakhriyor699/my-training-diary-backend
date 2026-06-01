/*
  Warnings:

  - You are about to drop the column `sessionId` on the `exercise_set_logs` table. All the data in the column will be lost.
  - Added the required column `exerciseLogId` to the `exercise_set_logs` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "exercise_set_logs" DROP CONSTRAINT "exercise_set_logs_sessionId_fkey";

-- AlterTable
ALTER TABLE "exercise_set_logs" DROP COLUMN "sessionId",
ADD COLUMN     "exerciseLogId" INTEGER NOT NULL,
ADD COLUMN     "trainingSessionId" INTEGER;

-- AlterTable
ALTER TABLE "training_sessions" ADD COLUMN     "workoutDayId" INTEGER;

-- CreateTable
CREATE TABLE "exercise_session_logs" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "exerciseId" INTEGER NOT NULL,
    "note" TEXT,
    "targetSetsSnapshot" INTEGER,
    "minRepsSnapshot" INTEGER,
    "maxRepsSnapshot" INTEGER,
    "targetRirSnapshot" INTEGER,
    "weightStepSnapshot" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_session_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_workoutDayId_fkey" FOREIGN KEY ("workoutDayId") REFERENCES "workout_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_set_logs" ADD CONSTRAINT "exercise_set_logs_exerciseLogId_fkey" FOREIGN KEY ("exerciseLogId") REFERENCES "exercise_session_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_set_logs" ADD CONSTRAINT "exercise_set_logs_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "training_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_session_logs" ADD CONSTRAINT "exercise_session_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_session_logs" ADD CONSTRAINT "exercise_session_logs_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
