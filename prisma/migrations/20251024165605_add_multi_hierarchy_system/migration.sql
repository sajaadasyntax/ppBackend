-- CreateEnum
CREATE TYPE "SectorType" AS ENUM ('SOCIAL', 'ECONOMIC', 'ORGANIZATIONAL', 'POLITICAL');

-- CreateEnum
CREATE TYPE "ActiveHierarchy" AS ENUM ('ORIGINAL', 'EXPATRIATE', 'SECTOR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminLevel" ADD VALUE 'NATIONAL_LEVEL';
ALTER TYPE "AdminLevel" ADD VALUE 'EXPATRIATE_GENERAL';
ALTER TYPE "AdminLevel" ADD VALUE 'EXPATRIATE_REGION';

-- DropForeignKey
ALTER TABLE "Bulletin" DROP CONSTRAINT "Bulletin_targetRegionId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_targetRegionId_fkey";

-- DropForeignKey
ALTER TABLE "Survey" DROP CONSTRAINT "Survey_targetRegionId_fkey";

-- DropForeignKey
ALTER TABLE "VotingItem" DROP CONSTRAINT "VotingItem_targetRegionId_fkey";

-- AlterTable
ALTER TABLE "Bulletin" ADD COLUMN     "targetExpatriateRegionId" TEXT,
ADD COLUMN     "targetNationalLevelId" TEXT,
ADD COLUMN     "targetSectorAdminUnitId" TEXT,
ADD COLUMN     "targetSectorDistrictId" TEXT,
ADD COLUMN     "targetSectorLocalityId" TEXT,
ADD COLUMN     "targetSectorNationalLevelId" TEXT,
ADD COLUMN     "targetSectorRegionId" TEXT,
ALTER COLUMN "targetRegionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Region" ADD COLUMN     "nationalLevelId" TEXT;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "targetExpatriateRegionId" TEXT,
ADD COLUMN     "targetNationalLevelId" TEXT,
ADD COLUMN     "targetSectorAdminUnitId" TEXT,
ADD COLUMN     "targetSectorDistrictId" TEXT,
ADD COLUMN     "targetSectorLocalityId" TEXT,
ADD COLUMN     "targetSectorNationalLevelId" TEXT,
ADD COLUMN     "targetSectorRegionId" TEXT,
ALTER COLUMN "targetRegionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "targetExpatriateRegionId" TEXT,
ADD COLUMN     "targetNationalLevelId" TEXT,
ADD COLUMN     "targetSectorAdminUnitId" TEXT,
ADD COLUMN     "targetSectorDistrictId" TEXT,
ADD COLUMN     "targetSectorLocalityId" TEXT,
ADD COLUMN     "targetSectorNationalLevelId" TEXT,
ADD COLUMN     "targetSectorRegionId" TEXT;

-- AlterTable
ALTER TABLE "Survey" ADD COLUMN     "targetExpatriateRegionId" TEXT,
ADD COLUMN     "targetNationalLevelId" TEXT,
ADD COLUMN     "targetSectorAdminUnitId" TEXT,
ADD COLUMN     "targetSectorDistrictId" TEXT,
ADD COLUMN     "targetSectorLocalityId" TEXT,
ADD COLUMN     "targetSectorNationalLevelId" TEXT,
ADD COLUMN     "targetSectorRegionId" TEXT,
ALTER COLUMN "targetRegionId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeHierarchy" "ActiveHierarchy" NOT NULL DEFAULT 'ORIGINAL',
ADD COLUMN     "expatriateRegionId" TEXT,
ADD COLUMN     "nationalLevelId" TEXT,
ADD COLUMN     "sectorAdminUnitId" TEXT,
ADD COLUMN     "sectorDistrictId" TEXT,
ADD COLUMN     "sectorLocalityId" TEXT,
ADD COLUMN     "sectorNationalLevelId" TEXT,
ADD COLUMN     "sectorRegionId" TEXT;

-- AlterTable
ALTER TABLE "VotingItem" ADD COLUMN     "targetExpatriateRegionId" TEXT,
ADD COLUMN     "targetNationalLevelId" TEXT,
ADD COLUMN     "targetSectorAdminUnitId" TEXT,
ADD COLUMN     "targetSectorDistrictId" TEXT,
ADD COLUMN     "targetSectorLocalityId" TEXT,
ADD COLUMN     "targetSectorNationalLevelId" TEXT,
ADD COLUMN     "targetSectorRegionId" TEXT,
ALTER COLUMN "targetRegionId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "NationalLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adminId" TEXT,

    CONSTRAINT "NationalLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpatriateRegion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adminId" TEXT,

    CONSTRAINT "ExpatriateRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectorNationalLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "sectorType" "SectorType" NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expatriateRegionId" TEXT,
    "adminId" TEXT,

    CONSTRAINT "SectorNationalLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectorRegion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "sectorType" "SectorType" NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sectorNationalLevelId" TEXT,
    "expatriateRegionId" TEXT,
    "adminId" TEXT,

    CONSTRAINT "SectorRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectorLocality" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "sectorType" "SectorType" NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sectorRegionId" TEXT,
    "expatriateRegionId" TEXT,
    "adminId" TEXT,

    CONSTRAINT "SectorLocality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectorAdminUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "sectorType" "SectorType" NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sectorLocalityId" TEXT,
    "expatriateRegionId" TEXT,
    "adminId" TEXT,

    CONSTRAINT "SectorAdminUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectorDistrict" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "sectorType" "SectorType" NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sectorAdminUnitId" TEXT,
    "expatriateRegionId" TEXT,
    "adminId" TEXT,

    CONSTRAINT "SectorDistrict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NationalLevel_code_key" ON "NationalLevel"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ExpatriateRegion_name_key" ON "ExpatriateRegion"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ExpatriateRegion_code_key" ON "ExpatriateRegion"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SectorNationalLevel_code_key" ON "SectorNationalLevel"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SectorRegion_code_key" ON "SectorRegion"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SectorLocality_code_key" ON "SectorLocality"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SectorAdminUnit_code_key" ON "SectorAdminUnit"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SectorDistrict_code_key" ON "SectorDistrict"("code");

-- AddForeignKey
ALTER TABLE "NationalLevel" ADD CONSTRAINT "NationalLevel_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_nationalLevelId_fkey" FOREIGN KEY ("nationalLevelId") REFERENCES "NationalLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpatriateRegion" ADD CONSTRAINT "ExpatriateRegion_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorNationalLevel" ADD CONSTRAINT "SectorNationalLevel_expatriateRegionId_fkey" FOREIGN KEY ("expatriateRegionId") REFERENCES "ExpatriateRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorNationalLevel" ADD CONSTRAINT "SectorNationalLevel_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorRegion" ADD CONSTRAINT "SectorRegion_sectorNationalLevelId_fkey" FOREIGN KEY ("sectorNationalLevelId") REFERENCES "SectorNationalLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorRegion" ADD CONSTRAINT "SectorRegion_expatriateRegionId_fkey" FOREIGN KEY ("expatriateRegionId") REFERENCES "ExpatriateRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorRegion" ADD CONSTRAINT "SectorRegion_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorLocality" ADD CONSTRAINT "SectorLocality_sectorRegionId_fkey" FOREIGN KEY ("sectorRegionId") REFERENCES "SectorRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorLocality" ADD CONSTRAINT "SectorLocality_expatriateRegionId_fkey" FOREIGN KEY ("expatriateRegionId") REFERENCES "ExpatriateRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorLocality" ADD CONSTRAINT "SectorLocality_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorAdminUnit" ADD CONSTRAINT "SectorAdminUnit_sectorLocalityId_fkey" FOREIGN KEY ("sectorLocalityId") REFERENCES "SectorLocality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorAdminUnit" ADD CONSTRAINT "SectorAdminUnit_expatriateRegionId_fkey" FOREIGN KEY ("expatriateRegionId") REFERENCES "ExpatriateRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorAdminUnit" ADD CONSTRAINT "SectorAdminUnit_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorDistrict" ADD CONSTRAINT "SectorDistrict_sectorAdminUnitId_fkey" FOREIGN KEY ("sectorAdminUnitId") REFERENCES "SectorAdminUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorDistrict" ADD CONSTRAINT "SectorDistrict_expatriateRegionId_fkey" FOREIGN KEY ("expatriateRegionId") REFERENCES "ExpatriateRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectorDistrict" ADD CONSTRAINT "SectorDistrict_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_nationalLevelId_fkey" FOREIGN KEY ("nationalLevelId") REFERENCES "NationalLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_expatriateRegionId_fkey" FOREIGN KEY ("expatriateRegionId") REFERENCES "ExpatriateRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sectorNationalLevelId_fkey" FOREIGN KEY ("sectorNationalLevelId") REFERENCES "SectorNationalLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sectorRegionId_fkey" FOREIGN KEY ("sectorRegionId") REFERENCES "SectorRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sectorLocalityId_fkey" FOREIGN KEY ("sectorLocalityId") REFERENCES "SectorLocality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sectorAdminUnitId_fkey" FOREIGN KEY ("sectorAdminUnitId") REFERENCES "SectorAdminUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sectorDistrictId_fkey" FOREIGN KEY ("sectorDistrictId") REFERENCES "SectorDistrict"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_targetNationalLevelId_fkey" FOREIGN KEY ("targetNationalLevelId") REFERENCES "NationalLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_targetRegionId_fkey" FOREIGN KEY ("targetRegionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_targetExpatriateRegionId_fkey" FOREIGN KEY ("targetExpatriateRegionId") REFERENCES "ExpatriateRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_targetSectorNationalLevelId_fkey" FOREIGN KEY ("targetSectorNationalLevelId") REFERENCES "SectorNationalLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_targetSectorRegionId_fkey" FOREIGN KEY ("targetSectorRegionId") REFERENCES "SectorRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_targetSectorLocalityId_fkey" FOREIGN KEY ("targetSectorLocalityId") REFERENCES "SectorLocality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_targetSectorAdminUnitId_fkey" FOREIGN KEY ("targetSectorAdminUnitId") REFERENCES "SectorAdminUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_targetSectorDistrictId_fkey" FOREIGN KEY ("targetSectorDistrictId") REFERENCES "SectorDistrict"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_targetNationalLevelId_fkey" FOREIGN KEY ("targetNationalLevelId") REFERENCES "NationalLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_targetRegionId_fkey" FOREIGN KEY ("targetRegionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_targetExpatriateRegionId_fkey" FOREIGN KEY ("targetExpatriateRegionId") REFERENCES "ExpatriateRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_targetSectorNationalLevelId_fkey" FOREIGN KEY ("targetSectorNationalLevelId") REFERENCES "SectorNationalLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_targetSectorRegionId_fkey" FOREIGN KEY ("targetSectorRegionId") REFERENCES "SectorRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_targetSectorLocalityId_fkey" FOREIGN KEY ("targetSectorLocalityId") REFERENCES "SectorLocality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_targetSectorAdminUnitId_fkey" FOREIGN KEY ("targetSectorAdminUnitId") REFERENCES "SectorAdminUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_targetSectorDistrictId_fkey" FOREIGN KEY ("targetSectorDistrictId") REFERENCES "SectorDistrict"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingItem" ADD CONSTRAINT "VotingItem_targetNationalLevelId_fkey" FOREIGN KEY ("targetNationalLevelId") REFERENCES "NationalLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingItem" ADD CONSTRAINT "VotingItem_targetRegionId_fkey" FOREIGN KEY ("targetRegionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingItem" ADD CONSTRAINT "VotingItem_targetExpatriateRegionId_fkey" FOREIGN KEY ("targetExpatriateRegionId") REFERENCES "ExpatriateRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingItem" ADD CONSTRAINT "VotingItem_targetSectorNationalLevelId_fkey" FOREIGN KEY ("targetSectorNationalLevelId") REFERENCES "SectorNationalLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingItem" ADD CONSTRAINT "VotingItem_targetSectorRegionId_fkey" FOREIGN KEY ("targetSectorRegionId") REFERENCES "SectorRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingItem" ADD CONSTRAINT "VotingItem_targetSectorLocalityId_fkey" FOREIGN KEY ("targetSectorLocalityId") REFERENCES "SectorLocality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingItem" ADD CONSTRAINT "VotingItem_targetSectorAdminUnitId_fkey" FOREIGN KEY ("targetSectorAdminUnitId") REFERENCES "SectorAdminUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotingItem" ADD CONSTRAINT "VotingItem_targetSectorDistrictId_fkey" FOREIGN KEY ("targetSectorDistrictId") REFERENCES "SectorDistrict"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetNationalLevelId_fkey" FOREIGN KEY ("targetNationalLevelId") REFERENCES "NationalLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetRegionId_fkey" FOREIGN KEY ("targetRegionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetExpatriateRegionId_fkey" FOREIGN KEY ("targetExpatriateRegionId") REFERENCES "ExpatriateRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetSectorNationalLevelId_fkey" FOREIGN KEY ("targetSectorNationalLevelId") REFERENCES "SectorNationalLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetSectorRegionId_fkey" FOREIGN KEY ("targetSectorRegionId") REFERENCES "SectorRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetSectorLocalityId_fkey" FOREIGN KEY ("targetSectorLocalityId") REFERENCES "SectorLocality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetSectorAdminUnitId_fkey" FOREIGN KEY ("targetSectorAdminUnitId") REFERENCES "SectorAdminUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetSectorDistrictId_fkey" FOREIGN KEY ("targetSectorDistrictId") REFERENCES "SectorDistrict"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_targetNationalLevelId_fkey" FOREIGN KEY ("targetNationalLevelId") REFERENCES "NationalLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_targetExpatriateRegionId_fkey" FOREIGN KEY ("targetExpatriateRegionId") REFERENCES "ExpatriateRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_targetSectorNationalLevelId_fkey" FOREIGN KEY ("targetSectorNationalLevelId") REFERENCES "SectorNationalLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_targetSectorRegionId_fkey" FOREIGN KEY ("targetSectorRegionId") REFERENCES "SectorRegion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_targetSectorLocalityId_fkey" FOREIGN KEY ("targetSectorLocalityId") REFERENCES "SectorLocality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_targetSectorAdminUnitId_fkey" FOREIGN KEY ("targetSectorAdminUnitId") REFERENCES "SectorAdminUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_targetSectorDistrictId_fkey" FOREIGN KEY ("targetSectorDistrictId") REFERENCES "SectorDistrict"("id") ON DELETE SET NULL ON UPDATE CASCADE;
