-- Phase 2 migration: integration webhooks, saved vault queries, integration health columns
-- Run after 001_add_fulltext_search.sql

BEGIN;

-- ============================================================
-- 1. Integration webhooks table
-- ============================================================
CREATE TABLE IF NOT EXISTS integration_webhooks (
  id SERIAL PRIMARY KEY,
  integration_id INTEGER NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  channel_id VARCHAR(255) NOT NULL,
  resource_id VARCHAR(255),
  provider VARCHAR(50) NOT NULL,
  callback_url TEXT,
  page_token TEXT,
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_notification_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_integration ON integration_webhooks(integration_id);
CREATE INDEX IF NOT EXISTS idx_webhook_channel ON integration_webhooks(channel_id);
CREATE INDEX IF NOT EXISTS idx_webhook_status ON integration_webhooks(status);

-- ============================================================
-- 2. Health monitoring columns on integrations
-- ============================================================
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'idle';
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS total_files_synced INTEGER DEFAULT 0;

-- ============================================================
-- 3. Saved vault queries table
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_vault_queries (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_user_id VARCHAR NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  query TEXT NOT NULL,
  search_mode VARCHAR(20) NOT NULL DEFAULT 'hybrid',
  project_ids JSONB DEFAULT '[]',
  filters JSONB,
  is_shared VARCHAR(10) DEFAULT 'private',
  last_used_at TIMESTAMPTZ,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_query_org ON saved_vault_queries(org_id);
CREATE INDEX IF NOT EXISTS idx_saved_query_user ON saved_vault_queries(created_by_user_id);

-- ============================================================
-- 4. Add external_modified_at to synced_files for change detection
-- ============================================================
ALTER TABLE synced_files ADD COLUMN IF NOT EXISTS external_modified_at TIMESTAMPTZ;
ALTER TABLE synced_files ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE synced_files ADD COLUMN IF NOT EXISTS external_checksum VARCHAR(255);

COMMIT;
