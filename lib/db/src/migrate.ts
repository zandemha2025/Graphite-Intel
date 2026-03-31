import { sql } from "drizzle-orm";
import { db } from "./index";

export async function runStartupMigrations(): Promise<void> {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
}
