-- Run this on the production database to add the missing enquiry columns.
-- Safe to run multiple times (IF NOT EXISTS / DO NOTHING pattern).

ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS source         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS contact_name   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS contact_number VARCHAR(30),
  ADD COLUMN IF NOT EXISTS gmail          VARCHAR(150),
  ADD COLUMN IF NOT EXISTS stage          VARCHAR(50) DEFAULT 'open';

-- User management: status, invite token, last login
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status              VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invite_token        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS invite_expires_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at       TIMESTAMPTZ;

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

UPDATE users SET status = 'active' WHERE status IS NULL;

-- Custom fields: definitions
CREATE TABLE IF NOT EXISTS custom_fields (
  id          SERIAL PRIMARY KEY,
  module      VARCHAR(50)  NOT NULL,
  label       VARCHAR(100) NOT NULL,
  field_key   VARCHAR(100) NOT NULL,
  type        VARCHAR(20)  NOT NULL DEFAULT 'text',
  options     JSONB,
  required    BOOLEAN      NOT NULL DEFAULT false,
  position    INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (module, field_key)
);

-- Custom field values stored as JSONB on each record
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE clients   ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}';
ALTER TABLE expenses  ADD COLUMN IF NOT EXISTS custom_data JSONB NOT NULL DEFAULT '{}';
