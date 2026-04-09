import { Router, type IRouter, type Request, type Response } from "express";
import { db, agentMemories } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/* ---------- GET /agents/:agentId/memory ---------- */

router.get("/agents/:agentId/memory", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const agentId = req.params.agentId as string;

  try {
    const memories = await db
      .select()
      .from(agentMemories)
      .where(
        and(
          eq(agentMemories.orgId, orgId),
          eq(agentMemories.agentId, agentId),
        ),
      )
      .orderBy(desc(agentMemories.createdAt));

    res.json(memories);
  } catch (err) {
    req.log.error({ err }, "Failed to list agent memories");
    res.status(500).json({ error: "Failed to list agent memories" });
  }
});

/* ---------- POST /agents/:agentId/memory ---------- */

router.post("/agents/:agentId/memory", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const orgId = req.user!.orgId!;
  const agentId = req.params.agentId as string;
  const { content, source } = req.body;

  if (!content || typeof content !== "string") {
    res.status(400).json({ error: "content is required" });
    return;
  }

  try {
    const [memory] = await db
      .insert(agentMemories)
      .values({
        orgId,
        agentId,
        content,
        source: source ?? "auto-learned",
      })
      .returning();

    res.status(201).json(memory);
  } catch (err) {
    req.log.error({ err }, "Failed to add agent memory");
    res.status(500).json({ error: "Failed to add agent memory" });
  }
});

/* ---------- DELETE /agents/:agentId/memory/:memoryId ---------- */

router.delete(
  "/agents/:agentId/memory/:memoryId",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;
    const orgId = req.user!.orgId!;
    const agentId = req.params.agentId as string;
    const memoryId = parseInt(req.params.memoryId as string);

    if (isNaN(memoryId)) {
      res.status(400).json({ error: "Invalid memory id" });
      return;
    }

    try {
      const [deleted] = await db
        .delete(agentMemories)
        .where(
          and(
            eq(agentMemories.id, memoryId),
            eq(agentMemories.orgId, orgId),
            eq(agentMemories.agentId, agentId),
          ),
        )
        .returning();

      if (!deleted) {
        res.status(404).json({ error: "Memory not found" });
        return;
      }

      res.json({ success: true });
    } catch (err) {
      req.log.error({ err }, "Failed to delete agent memory");
      res.status(500).json({ error: "Failed to delete agent memory" });
    }
  },
);

/* ---------- DELETE /agents/:agentId/memory ---------- */

router.delete(
  "/agents/:agentId/memory",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;
    const orgId = req.user!.orgId!;
    const agentId = req.params.agentId as string;

    try {
      await db
        .delete(agentMemories)
        .where(
          and(
            eq(agentMemories.orgId, orgId),
            eq(agentMemories.agentId, agentId),
          ),
        );

      res.json({ success: true });
    } catch (err) {
      req.log.error({ err }, "Failed to clear agent memories");
      res.status(500).json({ error: "Failed to clear agent memories" });
    }
  },
);

export { router as agentMemoryRouter };
export default router;
