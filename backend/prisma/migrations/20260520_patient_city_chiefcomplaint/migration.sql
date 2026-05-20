-- AddColumn city to patients
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "city" TEXT;

-- AddColumns chiefComplaint (AES-256-GCM) to patients
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "chiefComplaintEnc" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "chiefComplaintIv"  TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "chiefComplaintTag" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "chiefComplaintKv"  INTEGER DEFAULT 1;
