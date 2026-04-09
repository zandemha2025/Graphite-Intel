import { Router, type IRouter, type Request, type Response } from "express";
import { db, companyProfiles } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function profileFilter(req: Request) {
  const userId = req.user!.id;
  const orgId = req.user!.orgId;
  if (orgId) {
    return eq(companyProfiles.orgId, orgId);
  }
  return eq(companyProfiles.userId, userId);
}

/** Parse the competitors CSV string into an array */
function parseCompetitors(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

/* ---------- DELETE /api/intelligence/insights/:id ---------- */

router.delete(
  "/intelligence/insights/:id",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    const rawId = req.params.id;
    const identifier = decodeURIComponent(
      Array.isArray(rawId) ? rawId[0] : rawId,
    );

    if (!identifier) {
      res.status(400).json({ error: "Competitor identifier is required" });
      return;
    }

    try {
      const [profile] = await db
        .select()
        .from(companyProfiles)
        .where(profileFilter(req))
        .limit(1);

      if (!profile) {
        res.status(400).json({ error: "No company profile found" });
        return;
      }

      const competitors = parseCompetitors(profile.competitors);

      // Support both numeric index and competitor name
      let updated: string[];
      const numericId = parseInt(identifier, 10);

      if (!isNaN(numericId) && numericId >= 0 && numericId < competitors.length) {
        // Numeric index -- remove by position
        updated = competitors.filter((_, i) => i !== numericId);
      } else {
        // Name-based -- remove by case-insensitive match
        const before = competitors.length;
        updated = competitors.filter(
          (c) => c.toLowerCase() !== identifier.toLowerCase(),
        );
        if (updated.length === before) {
          res.status(404).json({ error: "Competitor not found" });
          return;
        }
      }

      const updatedCsv = updated.join(", ");

      await db
        .update(companyProfiles)
        .set({ competitors: updatedCsv })
        .where(eq(companyProfiles.id, profile.id));

      res.json({ message: "Competitor insight removed", competitors: updated });
    } catch (err) {
      req.log.error({ err }, "Failed to delete competitor insight");
      res.status(500).json({ error: "Failed to delete competitor insight" });
    }
  },
);

export default router;
