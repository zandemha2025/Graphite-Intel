import { Router, type IRouter, type Request, type Response } from "express";
import { db, mcpConfigs, mcpKeys, mcpUsageLogs } from "@workspace/db";
import { eq, and, isNull, desc } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/* ---------- GET /mcp/config ---------- */

router.get("/mcp/config", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const [config] = await db
      .select()
      .from(mcpConfigs)
      .where(eq(mcpConfigs.orgId, orgId))
      .limit(1);

    res.json(config ?? { enabled: false, serverUrl: null });
  } catch (err) {
    req.log.error({ err }, "Failed to get MCP config");
    res.status(500).json({ error: "Failed to get MCP config" });
  }
});

/* ---------- POST /mcp/config ---------- */

router.post("/mcp/config", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const { enabled, serverUrl } = req.body;

  try {
    const [existing] = await db
      .select()
      .from(mcpConfigs)
      .where(eq(mcpConfigs.orgId, orgId))
      .limit(1);

    let config;
    if (existing) {
      [config] = await db
        .update(mcpConfigs)
        .set({
          ...(enabled !== undefined && { enabled }),
          ...(serverUrl !== undefined && { serverUrl }),
          updatedAt: new Date(),
        })
        .where(eq(mcpConfigs.orgId, orgId))
        .returning();
    } else {
      [config] = await db
        .insert(mcpConfigs)
        .values({
          orgId,
          enabled: enabled ?? false,
          serverUrl: serverUrl ?? null,
        })
        .returning();
    }

    res.json(config);
  } catch (err) {
    req.log.error({ err }, "Failed to upsert MCP config");
    res.status(500).json({ error: "Failed to upsert MCP config" });
  }
});

/* ---------- POST /mcp/keys ---------- */

router.post("/mcp/keys", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const { name } = req.body;

  try {
    const rawKey = randomBytes(32).toString("hex");
    const keyPrefix = rawKey.slice(0, 8);
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const [created] = await db
      .insert(mcpKeys)
      .values({
        orgId,
        keyHash,
        keyPrefix,
        name: name ?? null,
      })
      .returning();

    // Return the full key only once -- the caller must save it
    res.status(201).json({
      id: created.id,
      key: rawKey,
      keyPrefix,
      name: created.name,
      createdAt: created.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to generate MCP key");
    res.status(500).json({ error: "Failed to generate MCP key" });
  }
});

/* ---------- GET /mcp/keys ---------- */

router.get("/mcp/keys", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const keys = await db
      .select({
        id: mcpKeys.id,
        keyPrefix: mcpKeys.keyPrefix,
        name: mcpKeys.name,
        createdAt: mcpKeys.createdAt,
        lastUsedAt: mcpKeys.lastUsedAt,
        revokedAt: mcpKeys.revokedAt,
      })
      .from(mcpKeys)
      .where(and(eq(mcpKeys.orgId, orgId), isNull(mcpKeys.revokedAt)))
      .orderBy(desc(mcpKeys.createdAt));

    res.json(keys);
  } catch (err) {
    req.log.error({ err }, "Failed to list MCP keys");
    res.status(500).json({ error: "Failed to list MCP keys" });
  }
});

/* ---------- DELETE /mcp/keys/:id ---------- */

router.delete("/mcp/keys/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid key id" });
    return;
  }

  try {
    const [revoked] = await db
      .update(mcpKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(mcpKeys.id, id), eq(mcpKeys.orgId, orgId)))
      .returning();

    if (!revoked) {
      res.status(404).json({ error: "Key not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to revoke MCP key");
    res.status(500).json({ error: "Failed to revoke MCP key" });
  }
});

/* ---------- GET /mcp/usage ---------- */

router.get("/mcp/usage", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;

  try {
    const logs = await db
      .select()
      .from(mcpUsageLogs)
      .where(eq(mcpUsageLogs.orgId, orgId))
      .orderBy(desc(mcpUsageLogs.createdAt))
      .limit(50);

    res.json(logs);
  } catch (err) {
    req.log.error({ err }, "Failed to list MCP usage logs");
    res.status(500).json({ error: "Failed to list MCP usage logs" });
  }
});

export { router as mcpRouter };
export default router;
