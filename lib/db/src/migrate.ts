import { sql } from "drizzle-orm";
import { db } from "./index";

export async function runStartupMigrations(): Promise<void> {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);

  // Ensure auth tables exist (idempotent — safe to run on every startup)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR UNIQUE,
      password_hash VARCHAR,
      first_name VARCHAR,
      last_name VARCHAR,
      profile_image_url VARCHAR,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sessions (
      sid VARCHAR PRIMARY KEY,
      sess JSONB NOT NULL,
      expire TIMESTAMPTZ NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire)
  `);

  // ── Organizations + members (must exist before boards/notebooks reference them) ──
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug VARCHAR NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS org_members (
      id SERIAL PRIMARY KEY,
      org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id VARCHAR NOT NULL,
      role VARCHAR NOT NULL DEFAULT 'member',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS org_invites (
      id SERIAL PRIMARY KEY,
      org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      token VARCHAR NOT NULL UNIQUE,
      email VARCHAR,
      created_by_user_id VARCHAR NOT NULL,
      used_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ── Company profiles ──
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS company_profiles (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL,
      org_id INTEGER UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      industry TEXT NOT NULL,
      stage VARCHAR NOT NULL,
      revenue_range VARCHAR NOT NULL,
      competitors TEXT NOT NULL DEFAULT '',
      strategic_priorities TEXT NOT NULL DEFAULT '',
      company_url TEXT,
      research_summary TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ── Boards ──
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS boards (
      id SERIAL PRIMARY KEY,
      org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      created_by_user_id VARCHAR NOT NULL,
      title VARCHAR NOT NULL,
      description TEXT,
      type VARCHAR NOT NULL DEFAULT 'live',
      config JSONB,
      is_shared BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Ensure notebooks tables exist (idempotent)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notebooks (
      id SERIAL PRIMARY KEY,
      org_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      created_by_user_id VARCHAR NOT NULL,
      title VARCHAR NOT NULL,
      description TEXT,
      is_published BOOLEAN NOT NULL DEFAULT false,
      refresh_schedule VARCHAR,
      last_refreshed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notebook_cells (
      id SERIAL PRIMARY KEY,
      notebook_id INTEGER NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
      cell_index INTEGER NOT NULL,
      title VARCHAR NOT NULL,
      prompt TEXT NOT NULL,
      output TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      data_source_hint VARCHAR,
      last_executed_at TIMESTAMPTZ,
      tokens_cost INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_notebook_org ON notebooks (org_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_notebook_cell_notebook ON notebook_cells (notebook_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_notebook_cell_index ON notebook_cells (notebook_id, cell_index)`);

  // Phase 1: Backfill orgId on documents from org_members for existing rows
  try {
    await db.execute(sql`
      UPDATE documents d
      SET org_id = (
        SELECT om.org_id FROM org_members om
        WHERE om.user_id = d.user_id
        LIMIT 1
      )
      WHERE d.org_id IS NULL
        AND d.user_id IS NOT NULL
        AND d.user_id != ''
    `);
  } catch (_) {
    // Column may not exist yet on first push — safe to ignore
  }
}
