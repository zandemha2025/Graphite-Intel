import { Router, type IRouter, type Request, type Response } from "express";
import { db, humanReviews, workflowExecutions } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { inngest } from "../inngest/client";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/**
 * GET /human-reviews
 * List pending human reviews for the organization.
 */
router.get("/human-reviews", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const orgId = req.user!.orgId;
  if (!orgId) {
    res.status(400).json({ error: "Organization context required" });
    return;
  }

  const status = (req.query.status as string) || "pending";
  const assignee = req.query.assignee as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const conditions = [
      eq(humanReviews.orgId, orgId),
      eq(humanReviews.status, status),
    ];

    if (assignee) {
      conditions.push(eq(humanReviews.assignedToUserId, assignee));
    }

    const reviews = await db
      .select()
      .from(humanReviews)
      .where(and(...conditions))
      .orderBy(desc(humanReviews.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(reviews);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch human reviews");
    res.status(500).json({ error: "Failed to fetch human reviews" });
  }
});

/**
 * GET /human-reviews/:id
 * Get a specific review with execution context.
 */
router.get("/human-reviews/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid review id" });
    return;
  }

  const orgId = req.user!.orgId;
  if (!orgId) {
    res.status(400).json({ error: "Organization context required" });
    return;
  }

  try {
    const [review] = await db
      .select()
      .from(humanReviews)
      .where(and(eq(humanReviews.id, id), eq(humanReviews.orgId, orgId)));

    if (!review) {
      res.status(404).json({ error: "Human review not found" });
      return;
    }

    // Also fetch the execution for context
    const [execution] = await db
      .select()
      .from(workflowExecutions)
      .where(eq(workflowExecutions.id, review.executionId));

    res.json({ ...review, execution });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch human review");
    res.status(500).json({ error: "Failed to fetch human review" });
  }
});

/**
 * POST /human-reviews/:id/decide
 * Submit a review decision (approve/reject/modify).
 * Sends the workflow/human-review.completed event to resume execution.
 */
router.post(
  "/human-reviews/:id/decide",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid review id" });
      return;
    }

    const orgId = req.user!.orgId;
    if (!orgId) {
      res.status(400).json({ error: "Organization context required" });
      return;
    }

    const { decision, feedback, modifiedData } = req.body;

    if (!decision || !["approved", "rejected", "modified"].includes(decision)) {
      res.status(400).json({
        error: "decision must be one of: approved, rejected, modified",
      });
      return;
    }

    try {
      const [review] = await db
        .select()
        .from(humanReviews)
        .where(and(eq(humanReviews.id, id), eq(humanReviews.orgId, orgId)));

      if (!review) {
        res.status(404).json({ error: "Human review not found" });
        return;
      }

      if (review.status !== "pending") {
        res.status(400).json({
          error: `Review already has status '${review.status}'`,
        });
        return;
      }

      // Update the review record
      const [updated] = await db
        .update(humanReviews)
        .set({
          decision,
          feedback: feedback || null,
          modifiedData: modifiedData || null,
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(humanReviews.id, id))
        .returning();

      // Send Inngest event to resume the workflow
      await inngest.send({
        name: "workflow/human-review.completed",
        data: {
          executionId: review.executionId,
          stepIndex: review.stepIndex,
          approved: decision === "approved" || decision === "modified",
          feedback: feedback || undefined,
          modifiedData: modifiedData || undefined,
        },
      });

      res.json(updated);
    } catch (err) {
      req.log.error({ err }, "Failed to submit review decision");
      res.status(500).json({ error: "Failed to submit review decision" });
    }
  },
);

export default router;
