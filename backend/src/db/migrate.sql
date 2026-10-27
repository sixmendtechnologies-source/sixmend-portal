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

-- System / built-in field control
ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS visible   BOOLEAN NOT NULL DEFAULT true;

-- Client total project value
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS total_value      DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS total_value_note TEXT;

-- Client phases (tasks)
CREATE TABLE IF NOT EXISTS client_phases (
  id          SERIAL PRIMARY KEY,
  client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'todo',
  start_date  DATE,
  end_date    DATE,
  position    INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Phase time logs
CREATE TABLE IF NOT EXISTS phase_time_logs (
  id          SERIAL PRIMARY KEY,
  phase_id    INTEGER NOT NULL REFERENCES client_phases(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  created_by  VARCHAR(100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Client payments
CREATE TABLE IF NOT EXISTS client_payments (
  id                   SERIAL PRIMARY KEY,
  client_id            INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title                VARCHAR(200) NOT NULL,
  amount               DECIMAL(12,2) NOT NULL,
  payment_date         DATE,
  status               VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes                TEXT,
  mode                 VARCHAR(50),
  invoice_number       VARCHAR(100),
  invoice_generated_at TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Client documents
CREATE TABLE IF NOT EXISTS client_documents (
  id          SERIAL PRIMARY KEY,
  client_id   INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  file_url    TEXT,
  file_data   TEXT,
  file_name   VARCHAR(200),
  uploaded_by VARCHAR(100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Client comments
CREATE TABLE IF NOT EXISTS client_comments (
  id         SERIAL PRIMARY KEY,
  client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  author     VARCHAR(100),
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoice number sequence (required for invoice generation)
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Expense type: debit (money out) or credit (money in)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS type VARCHAR(10) NOT NULL DEFAULT 'debit';

-- Client-linked expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;

-- Service renewals per client
CREATE TABLE IF NOT EXISTS client_services (
  id            SERIAL PRIMARY KEY,
  client_id     INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  type          VARCHAR(50)  NOT NULL DEFAULT 'other',
  renewal_date  DATE         NOT NULL,
  reminder_days INT          NOT NULL DEFAULT 30,
  cost          DECIMAL(12,2),
  status        VARCHAR(20)  NOT NULL DEFAULT 'active',
  notes         TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Change default client status from prospect to active
ALTER TABLE clients ALTER COLUMN status SET DEFAULT 'active';

-- Enquiry comments
CREATE TABLE IF NOT EXISTS enquiry_comments (
  id          SERIAL PRIMARY KEY,
  enquiry_id  INTEGER NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  author      VARCHAR(100),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enquiry call status
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS call_status VARCHAR(50);

-- Extended client business/invoicing fields
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS state                VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state_code           VARCHAR(20),
  ADD COLUMN IF NOT EXISTS pin_code             VARCHAR(10),
  ADD COLUMN IF NOT EXISTS gstin                VARCHAR(20),
  ADD COLUMN IF NOT EXISTS website              VARCHAR(200),
  ADD COLUMN IF NOT EXISTS bank_account_name    VARCHAR(200),
  ADD COLUMN IF NOT EXISTS bank_name            VARCHAR(200),
  ADD COLUMN IF NOT EXISTS account_number       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ifsc_code            VARCHAR(20),
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT,
  ADD COLUMN IF NOT EXISTS default_payment_terms TEXT;

-- Company settings (single-row config for invoice module)
CREATE TABLE IF NOT EXISTS company_settings (
  id                    INT PRIMARY KEY DEFAULT 1,
  legal_name            VARCHAR(200),
  address               TEXT,
  state                 VARCHAR(100),
  state_code            VARCHAR(20),
  pin_code              VARCHAR(10),
  gstin                 VARCHAR(20),
  email                 VARCHAR(150),
  phone                 VARCHAR(30),
  website               VARCHAR(200),
  bank_account_name     VARCHAR(200),
  bank_name             VARCHAR(200),
  account_number        VARCHAR(50),
  ifsc_code             VARCHAR(20),
  payment_instructions  TEXT,
  default_payment_terms TEXT,
  signatory_name        VARCHAR(200),
  signatory_designation VARCHAR(100),
  logo_data             TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO company_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Project value breakdown and GST on clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS project_items JSONB,
  ADD COLUMN IF NOT EXISTS project_gst   DECIMAL(5,2) DEFAULT 0;

-- User signature for invoice generation
ALTER TABLE users ADD COLUMN IF NOT EXISTS signature_data TEXT;

-- Company seal image
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS seal_data TEXT;

-- UPI ID for company settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);

-- Tax invoice history per client
CREATE TABLE IF NOT EXISTS client_tax_invoices (
  id             SERIAL PRIMARY KEY,
  client_id      INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date   DATE,
  total_amount   DECIMAL(12,2),
  status         VARCHAR(20) NOT NULL DEFAULT 'active',
  created_by     VARCHAR(100),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fix existing comments authored as 'Admin' — set to the actual admin user's name
UPDATE enquiry_comments
  SET author = (SELECT name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
  WHERE author = 'Admin';

UPDATE client_comments
  SET author = (SELECT name FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
  WHERE author = 'Admin';
