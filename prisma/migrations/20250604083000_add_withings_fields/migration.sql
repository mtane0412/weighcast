-- AlterTable
ALTER TABLE "User" ADD COLUMN     "withingsUserId" TEXT,
ADD COLUMN     "withingsAccessToken" TEXT,
ADD COLUMN     "withingsRefreshToken" TEXT,
ADD COLUMN     "withingsTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_withingsUserId_key" ON "User"("withingsUserId");