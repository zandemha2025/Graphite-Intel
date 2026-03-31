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

router.get("/company-profile", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const userId = req.user!.id;

  try {
    const [profile] = await db
      .select()
      .from(companyProfiles)
      .where(eq(companyProfiles.userId, userId));

    if (!profile) {
      res.status(404).json({ error: "No profile found" });
      return;
    }

    res.json(profile);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch company profile");
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.post("/company-profile", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const userId = req.user!.id;
  const { companyName, industry, stage, revenueRange, competitors, strategicPriorities } = req.body;

  if (!companyName || !industry || !stage || !revenueRange) {
    res.status(400).json({ error: "companyName, industry, stage, and revenueRange are required" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(companyProfiles)
      .where(eq(companyProfiles.userId, userId));

    if (existing) {
      const [updated] = await db
        .update(companyProfiles)
        .set({
          companyName,
          industry,
          stage,
          revenueRange,
          competitors: competitors || "",
          strategicPriorities: strategicPriorities || "",
          updatedAt: new Date(),
        })
        .where(eq(companyProfiles.userId, userId))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db
        .insert(companyProfiles)
        .values({
          userId,
          companyName,
          industry,
          stage,
          revenueRange,
          competitors: competitors || "",
          strategicPriorities: strategicPriorities || "",
        })
        .returning();
      res.status(201).json(created);
    }
  } catch (err) {
    req.log.error({ err }, "Failed to save company profile");
    res.status(500).json({ error: "Failed to save profile" });
  }
});

router.put("/company-profile", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const userId = req.user!.id;
  const { companyName, industry, stage, revenueRange, competitors, strategicPriorities } = req.body;

  try {
    const [updated] = await db
      .update(companyProfiles)
      .set({
        ...(companyName !== undefined && { companyName }),
        ...(industry !== undefined && { industry }),
        ...(stage !== undefined && { stage }),
        ...(revenueRange !== undefined && { revenueRange }),
        ...(competitors !== undefined && { competitors }),
        ...(strategicPriorities !== undefined && { strategicPriorities }),
        updatedAt: new Date(),
      })
      .where(eq(companyProfiles.userId, userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update company profile");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
