/*
  Warnings:

  - Made the column `nationalLevelId` on table `Region` required. This step will fail if there are existing NULL values in that column.
  - Made the column `expatriateRegionId` on table `SectorNationalLevel` required. This step will fail if there are existing NULL values in that column.

*/

-- Step 1: Ensure NationalLevel exists, create if it doesn't
INSERT INTO "NationalLevel" (id, name, code, description, active, "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  'المستوى القومي',
  'NATIONAL',
  'المستوى القومي الأعلى',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "NationalLevel" WHERE code = 'NATIONAL');

-- Step 2: Update all NULL nationalLevelId in Region to point to the NationalLevel
UPDATE "Region"
SET "nationalLevelId" = (SELECT id FROM "NationalLevel" WHERE code = 'NATIONAL' LIMIT 1)
WHERE "nationalLevelId" IS NULL;

-- Step 3: Ensure at least one ExpatriateRegion exists, create if none exist
INSERT INTO "ExpatriateRegion" (id, name, code, description, active, "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  'قطاع الخليج',
  'EXPAT-1',
  'منطقة المغتربين: قطاع الخليج',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "ExpatriateRegion" LIMIT 1);

-- Step 4: Update all NULL expatriateRegionId in SectorNationalLevel to point to an ExpatriateRegion
UPDATE "SectorNationalLevel"
SET "expatriateRegionId" = (SELECT id FROM "ExpatriateRegion" LIMIT 1)
WHERE "expatriateRegionId" IS NULL;

-- Step 5: Drop foreign key constraints temporarily
ALTER TABLE "Region" DROP CONSTRAINT IF EXISTS "Region_nationalLevelId_fkey";

ALTER TABLE "SectorNationalLevel" DROP CONSTRAINT IF EXISTS "SectorNationalLevel_expatriateRegionId_fkey";

-- Step 6: Make columns required
ALTER TABLE "Region" ALTER COLUMN "nationalLevelId" SET NOT NULL;

ALTER TABLE "SectorNationalLevel" ALTER COLUMN "expatriateRegionId" SET NOT NULL;

-- Step 7: Re-add foreign key constraints
ALTER TABLE "Region" ADD CONSTRAINT "Region_nationalLevelId_fkey" FOREIGN KEY ("nationalLevelId") REFERENCES "NationalLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SectorNationalLevel" ADD CONSTRAINT "SectorNationalLevel_expatriateRegionId_fkey" FOREIGN KEY ("expatriateRegionId") REFERENCES "ExpatriateRegion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
