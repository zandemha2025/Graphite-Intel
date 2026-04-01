-- Phase 3 migration: collaboration (sharing, comments, guests, activity, presence) + playbooks
-- Run after 002_phase2_integrations_vault.sql

BEGIN;

-- ============================================================
-- 1. Resource sharing
-- ============================================================
CREATE TABLE IF NOT EXISTS resource_shares (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,
  resource_id INTEGER NOT NULL,
  shared_by_user_id VARCHAR NOT NULL,
  shared_with_user_id VARCHAR,
  shared_with_email VARCHAR(255),
  permission VARCHAR(20) NOT NULL DEFAULT 'read',
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_org ON resource_shares(org_id);
CREATE INDEX IF NOT EXISTS idx_share_resource ON resource_shares(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_share_user ON resource_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_share_email ON resource_shares(shared_with_email);

-- ============================================================
-- 2. Comments / annotations
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,
  resource_id INTEGER NOT NULL,
  parent_id INTEGER,
  user_id VARCHAR NOT NULL,
  content TEXT NOT NULL,
  anchor JSONB,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by_user_id VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comment_resource ON comments(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_comment_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comment_user ON comments(user_id);

-- ============================================================
-- 3. Guest tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS guest_tokens (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  token VARCHAR(128) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_accessed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_token ON guest_tokens(token);
CREATE INDEX IF NOT EXISTS idx_guest_org_email ON guest_tokens(org_id, email);

-- ============================================================
-- 4. Activity feed
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_feed (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id INTEGER NOT NULL,
  resource_title TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_org ON activity_feed(org_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_feed(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_feed(user_id);

-- ============================================================
-- 5. User presence (ephemeral)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_presence (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL,
  resource_type VARCHAR(50),
  resource_id INTEGER,
  status VARCHAR(20) DEFAULT 'online',
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_presence_user_resource ON user_presence(user_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_presence_resource ON user_presence(resource_type, resource_id);

-- ============================================================
-- 6. Playbooks
-- ============================================================
CREATE TABLE IF NOT EXISTS playbooks (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_user_id VARCHAR NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50),
  source_document_ids JSONB,
  steps JSONB NOT NULL,
  is_template BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,
  parent_id INTEGER,
  tags JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playbook_org ON playbooks(org_id);
CREATE INDEX IF NOT EXISTS idx_playbook_category ON playbooks(category);
CREATE INDEX IF NOT EXISTS idx_playbook_parent ON playbooks(parent_id);

-- ============================================================
-- 7. Playbook runs
-- ============================================================
CREATE TABLE IF NOT EXISTS playbook_runs (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  playbook_id INTEGER NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  triggered_by_user_id VARCHAR NOT NULL,
  title TEXT NOT NULL,
  target_document_ids JSONB NOT NULL,
  workflow_execution_id INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  step_results JSONB,
  completed_steps INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playbook_run_org ON playbook_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_playbook_run_playbook ON playbook_runs(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_run_status ON playbook_runs(status);

-- ============================================================
-- 8. Seed built-in playbook templates (org_id=0 = system-level)
-- ============================================================
INSERT INTO playbooks (org_id, created_by_user_id, name, description, category, steps, is_template, is_published, version)
VALUES
  (0, 'system', 'M&A Due Diligence Checklist', 'Comprehensive due diligence review for mergers and acquisitions', 'due_diligence',
   '[{"index":0,"title":"Corporate Structure Review","description":"Review corporate organizational charts, subsidiary relationships, and governance documents","type":"extract","config":{"extractionFields":["entity_name","jurisdiction","ownership_percentage","directors"]},"isRequired":true},{"index":1,"title":"Financial Statement Analysis","description":"Analyze balance sheets, income statements, and cash flow for the last 3 years","type":"review","config":{"aiPrompt":"Analyze these financial statements for trends, red flags, and key metrics. Highlight any material changes year-over-year."},"isRequired":true},{"index":2,"title":"Contract Review","description":"Review all material contracts including customer agreements, vendor contracts, and leases","type":"extract","config":{"extractionFields":["parties","term","value","termination_clauses","change_of_control"]},"isRequired":true},{"index":3,"title":"Intellectual Property Audit","description":"Catalog all patents, trademarks, copyrights, and trade secrets","type":"checklist","config":{},"isRequired":true},{"index":4,"title":"Litigation Assessment","description":"Review pending and threatened litigation, regulatory actions, and disputes","type":"flag","config":{"flagConditions":["pending_litigation","regulatory_investigation","material_dispute"]},"isRequired":true},{"index":5,"title":"Employee & Benefits Review","description":"Review employment agreements, benefit plans, and organizational structure","type":"extract","config":{"extractionFields":["employee_count","key_personnel","compensation_structure","benefit_plans"]},"isRequired":false}]',
   true, true, 1),
  (0, 'system', 'Contract Review Playbook', 'Standard contract review checklist for legal agreements', 'review',
   '[{"index":0,"title":"Party Identification","description":"Identify all parties, their roles, and authority to enter the agreement","type":"extract","config":{"extractionFields":["party_name","role","authority","jurisdiction"]},"isRequired":true},{"index":1,"title":"Term & Termination","description":"Review contract duration, renewal terms, and termination provisions","type":"extract","config":{"extractionFields":["effective_date","term_length","auto_renewal","termination_for_cause","termination_for_convenience","notice_period"]},"isRequired":true},{"index":2,"title":"Financial Terms","description":"Review pricing, payment terms, and financial obligations","type":"extract","config":{"extractionFields":["contract_value","payment_schedule","late_fees","price_escalation"]},"isRequired":true},{"index":3,"title":"Liability & Indemnification","description":"Assess liability caps, indemnification clauses, and insurance requirements","type":"review","config":{"aiPrompt":"Analyze liability and indemnification provisions. Flag any unlimited liability, one-sided indemnification, or unusual insurance requirements."},"isRequired":true},{"index":4,"title":"Compliance Check","description":"Verify compliance with applicable regulations and internal policies","type":"flag","config":{"flagConditions":["non_compete_clause","data_privacy_concern","regulatory_requirement","unusual_governing_law"]},"isRequired":true}]',
   true, true, 1),
  (0, 'system', 'Compliance Audit Checklist', 'Standard compliance audit framework', 'compliance',
   '[{"index":0,"title":"Policy Documentation Review","description":"Verify all required compliance policies are documented and current","type":"checklist","config":{},"isRequired":true},{"index":1,"title":"Data Privacy Assessment","description":"Review data handling practices against GDPR/CCPA requirements","type":"review","config":{"aiPrompt":"Assess data privacy practices against current regulations. Identify gaps in data protection, consent management, and data subject rights."},"isRequired":true},{"index":2,"title":"Access Control Audit","description":"Review user access controls, authentication mechanisms, and privilege management","type":"checklist","config":{},"isRequired":true},{"index":3,"title":"Incident Response Review","description":"Evaluate incident response plans and historical incident handling","type":"review","config":{"aiPrompt":"Review the incident response plan for completeness. Check for defined roles, communication procedures, and post-incident review processes."},"isRequired":true},{"index":4,"title":"Vendor Risk Assessment","description":"Assess third-party vendor compliance and risk management","type":"extract","config":{"extractionFields":["vendor_name","data_access_level","compliance_certifications","last_audit_date","risk_rating"]},"isRequired":false}]',
   true, true, 1)
ON CONFLICT DO NOTHING;

COMMIT;
