-- Run this on the production database to add the missing enquiry columns.
-- Safe to run multiple times (IF NOT EXISTS / DO NOTHING pattern).

ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS source         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS contact_name   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS contact_number VARCHAR(30),
  ADD COLUMN IF NOT EXISTS gmail          VARCHAR(150),
  ADD COLUMN IF NOT EXISTS stage          VARCHAR(50) DEFAULT 'open';
