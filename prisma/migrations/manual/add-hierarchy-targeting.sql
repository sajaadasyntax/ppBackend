-- Add hierarchy targeting fields to content models
-- This migration adds hierarchy filtering capability to content models

-- Add hierarchy targeting fields to Bulletin table
ALTER TABLE "Bulletin" ADD COLUMN IF NOT EXISTS "targetRegionId" TEXT;
ALTER TABLE "Bulletin" ADD COLUMN IF NOT EXISTS "targetLocalityId" TEXT;
ALTER TABLE "Bulletin" ADD COLUMN IF NOT EXISTS "targetAdminUnitId" TEXT;
ALTER TABLE "Bulletin" ADD COLUMN IF NOT EXISTS "targetDistrictId" TEXT;

-- Add hierarchy targeting fields to Survey table
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "targetRegionId" TEXT;
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "targetLocalityId" TEXT;
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "targetAdminUnitId" TEXT;
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "targetDistrictId" TEXT;

-- Add hierarchy targeting fields to VotingItem table
ALTER TABLE "VotingItem" ADD COLUMN IF NOT EXISTS "targetRegionId" TEXT;
ALTER TABLE "VotingItem" ADD COLUMN IF NOT EXISTS "targetLocalityId" TEXT;
ALTER TABLE "VotingItem" ADD COLUMN IF NOT EXISTS "targetAdminUnitId" TEXT;
ALTER TABLE "VotingItem" ADD COLUMN IF NOT EXISTS "targetDistrictId" TEXT;

-- Add hierarchy targeting fields to Report table
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "targetRegionId" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "targetLocalityId" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "targetAdminUnitId" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "targetDistrictId" TEXT;

-- Add foreign key constraints (uncomment if using PostgreSQL)
-- ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_targetRegionId_fkey" FOREIGN KEY ("targetRegionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_targetLocalityId_fkey" FOREIGN KEY ("targetLocalityId") REFERENCES "Locality"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_targetAdminUnitId_fkey" FOREIGN KEY ("targetAdminUnitId") REFERENCES "AdminUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_targetDistrictId_fkey" FOREIGN KEY ("targetDistrictId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Similar constraints for other tables...
-- (Add similar foreign key constraints for Survey, VotingItem, and Report tables if needed)

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "Bulletin_targetRegionId_idx" ON "Bulletin"("targetRegionId");
CREATE INDEX IF NOT EXISTS "Bulletin_targetLocalityId_idx" ON "Bulletin"("targetLocalityId");
CREATE INDEX IF NOT EXISTS "Bulletin_targetAdminUnitId_idx" ON "Bulletin"("targetAdminUnitId");
CREATE INDEX IF NOT EXISTS "Bulletin_targetDistrictId_idx" ON "Bulletin"("targetDistrictId");

CREATE INDEX IF NOT EXISTS "Survey_targetRegionId_idx" ON "Survey"("targetRegionId");
CREATE INDEX IF NOT EXISTS "Survey_targetLocalityId_idx" ON "Survey"("targetLocalityId");
CREATE INDEX IF NOT EXISTS "Survey_targetAdminUnitId_idx" ON "Survey"("targetAdminUnitId");
CREATE INDEX IF NOT EXISTS "Survey_targetDistrictId_idx" ON "Survey"("targetDistrictId");

CREATE INDEX IF NOT EXISTS "VotingItem_targetRegionId_idx" ON "VotingItem"("targetRegionId");
CREATE INDEX IF NOT EXISTS "VotingItem_targetLocalityId_idx" ON "VotingItem"("targetLocalityId");
CREATE INDEX IF NOT EXISTS "VotingItem_targetAdminUnitId_idx" ON "VotingItem"("targetAdminUnitId");
CREATE INDEX IF NOT EXISTS "VotingItem_targetDistrictId_idx" ON "VotingItem"("targetDistrictId");

CREATE INDEX IF NOT EXISTS "Report_targetRegionId_idx" ON "Report"("targetRegionId");
CREATE INDEX IF NOT EXISTS "Report_targetLocalityId_idx" ON "Report"("targetLocalityId");
CREATE INDEX IF NOT EXISTS "Report_targetAdminUnitId_idx" ON "Report"("targetAdminUnitId");
CREATE INDEX IF NOT EXISTS "Report_targetDistrictId_idx" ON "Report"("targetDistrictId");
