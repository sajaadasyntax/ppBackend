/*
  Warnings:

  - Added the required column `amount` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "amount" TEXT NOT NULL DEFAULT '0',
ADD COLUMN     "paymentDate" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "receipt" TEXT;

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "approverId" TEXT,
ADD COLUMN     "creatorId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDonation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "targetAdminUnitId" TEXT,
ADD COLUMN     "targetDistrictId" TEXT,
ADD COLUMN     "targetLocalityId" TEXT,
ADD COLUMN     "targetRegionId" TEXT;

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_targetRegionId_fkey" FOREIGN KEY ("targetRegionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_targetLocalityId_fkey" FOREIGN KEY ("targetLocalityId") REFERENCES "Locality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_targetAdminUnitId_fkey" FOREIGN KEY ("targetAdminUnitId") REFERENCES "AdminUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_targetDistrictId_fkey" FOREIGN KEY ("targetDistrictId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
