-- CreateTable
CREATE TABLE "user_plan_interactions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "liked" BOOLEAN NOT NULL DEFAULT false,
    "saved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_plan_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_plan_interactions_userId_planId_key" ON "user_plan_interactions"("userId", "planId");

-- AddForeignKey
ALTER TABLE "user_plan_interactions" ADD CONSTRAINT "user_plan_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_plan_interactions" ADD CONSTRAINT "user_plan_interactions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "training_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
