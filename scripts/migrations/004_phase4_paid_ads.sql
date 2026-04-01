-- Phase 4: Paid Ads Module
-- Adds ad accounts, campaigns, creatives, metrics, optimization logs, and reports.

BEGIN;

-- ─── Ad Accounts ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ad_accounts (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  platform VARCHAR(30) NOT NULL,       -- google_ads, meta, linkedin, tiktok
  external_account_id VARCHAR(255) NOT NULL,
  account_name TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  currency VARCHAR(10) DEFAULT 'USD',
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_sync_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_account_org ON ad_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_ad_account_platform ON ad_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_ad_account_external ON ad_accounts(external_account_id);

-- ─── Ad Campaigns ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ad_account_id INTEGER REFERENCES ad_accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  objective VARCHAR(50) NOT NULL DEFAULT 'awareness',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  platforms JSONB DEFAULT '[]',
  external_campaign_ids JSONB DEFAULT '{}',
  budget_daily NUMERIC(12, 2),
  budget_total NUMERIC(12, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  targeting JSONB,
  ai_suggestions JSONB,
  created_by_user_id VARCHAR,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_campaign_org ON ad_campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaign_account ON ad_campaigns(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaign_status ON ad_campaigns(status);

-- ─── Ad Creatives ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ad_creatives (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type VARCHAR(30) NOT NULL,            -- text, image, video, carousel, responsive
  headline TEXT,
  description TEXT,
  call_to_action VARCHAR(50),
  media_urls JSONB DEFAULT '[]',
  thumbnail_url TEXT,
  variants JSONB DEFAULT '[]',
  performance_score NUMERIC(5, 2),
  is_ai_generated BOOLEAN DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_creative_campaign ON ad_creatives(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_creative_org ON ad_creatives(org_id);

-- ─── Ad Metrics ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ad_metrics (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  ad_account_id INTEGER NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  platform VARCHAR(30) NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend NUMERIC(12, 2) DEFAULT 0,
  revenue NUMERIC(12, 2) DEFAULT 0,
  ctr NUMERIC(8, 4),
  cpc NUMERIC(10, 4),
  cpa NUMERIC(10, 4),
  roas NUMERIC(10, 4),
  reach INTEGER DEFAULT 0,
  frequency NUMERIC(6, 2),
  video_views INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  creative_breakdown JSONB,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_metrics_campaign_date ON ad_metrics(campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_account ON ad_metrics(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_platform_date ON ad_metrics(platform, date);

-- ─── Ad Optimization Logs ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ad_optimization_logs (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,            -- budget, targeting, creative, bidding, schedule, pause
  mode VARCHAR(20) NOT NULL,            -- recommend, auto
  recommendation TEXT NOT NULL,
  details JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ,
  applied_by_user_id VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_opt_campaign ON ad_optimization_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_opt_org ON ad_optimization_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_ad_opt_status ON ad_optimization_logs(status);

-- ─── Ad Reports ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ad_reports (
  id SERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  report_type VARCHAR(30) NOT NULL,     -- performance, comparison, trend, roi, creative_analysis
  campaign_ids JSONB DEFAULT '[]',
  date_range JSONB NOT NULL,
  metrics JSONB DEFAULT '[]',
  generated_content JSONB,
  file_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_by_user_id VARCHAR,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_report_org ON ad_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_ad_report_status ON ad_reports(status);

COMMIT;
