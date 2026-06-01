-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('compound', 'isolation', 'bodyweight');

-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "type" "ExerciseType" NOT NULL DEFAULT 'compound';
