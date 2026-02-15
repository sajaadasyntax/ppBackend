-- AlterTable: Add soft-delete support to ArchiveDocument
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ArchiveDocument' AND column_name = 'deletedAt'
  ) THEN
    ALTER TABLE "ArchiveDocument" ADD COLUMN "deletedAt" TIMESTAMP(3);
  END IF;
END $$;
