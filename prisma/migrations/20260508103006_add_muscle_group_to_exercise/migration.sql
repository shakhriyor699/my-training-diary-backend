-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps', 'abs', 'glutes', 'calves', 'full_body');

-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "muscleGroup" "MuscleGroup" NOT NULL DEFAULT 'full_body';
