import { sql } from "drizzle-orm";
import { db } from "./index";

export async function runStartupMigrations(): Promise<void> {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);

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
