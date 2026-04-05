import { Router, type IRouter, type Request, type Response } from "express";
import { db, organizations, orgMembers, orgInvites, usersTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function requireAdmin(req: Request, res: Response): boolean {
  if (!requireAuth(req, res)) return false;
  if (req.user!.orgRole !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

router.get("/org", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const orgId = req.user!.orgId;
  if (!orgId) {
    res.status(404).json({ error: "No organization found" });
    return;
  }

  try {
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId));

    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    res.json(org);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch org");
    res.status(500).json({ error: "Failed to fetch organization" });
  }
});

router.post("/org", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const userId = req.user!.id;

  if (req.user!.orgId) {
    res.status(400).json({ error: "You are already a member of an organization" });
    return;
  }

  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Organization name is required" });
    return;
  }

  try {
    const baseSlug = slugify(name.trim());
    let slug = baseSlug;
    let attempt = 0;

    while (true) {
      const [existing] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug));
      if (!existing) break;
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const [org] = await db
      .insert(organizations)
      .values({ name: name.trim(), slug })
      .returning();

    await db.insert(orgMembers).values({
      orgId: org.id,
      userId,
      role: "admin",
    });

    res.status(201).json(org);
  } catch (err) {
    req.log.error({ err }, "Failed to create org");
    res.status(500).json({ error: "Failed to create organization" });
  }
});

router.get("/org/members", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const orgId = req.user!.orgId;
  if (!orgId) {
    res.status(404).json({ error: "No organization found" });
    return;
  }

  try {
    const members = await db
      .select({
        id: orgMembers.id,
        userId: orgMembers.userId,
        role: orgMembers.role,
        joinedAt: orgMembers.joinedAt,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        profileImageUrl: usersTable.profileImageUrl,
      })
      .from(orgMembers)
      .leftJoin(usersTable, eq(orgMembers.userId, usersTable.id))
      .where(eq(orgMembers.orgId, orgId));

    res.json(members);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch members");
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

router.patch("/org/members/:userId", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const orgId = req.user!.orgId!;
  const targetUserId = req.params.userId as string;
  const { role } = req.body;

  if (!role || !["admin", "member"].includes(role)) {
    res.status(400).json({ error: "Role must be 'admin' or 'member'" });
    return;
  }

  if (targetUserId === req.user!.id) {
    res.status(400).json({ error: "You cannot change your own role" });
    return;
  }

  try {
    const [updated] = await db
      .update(orgMembers)
      .set({ role })
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, targetUserId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update member role");
    res.status(500).json({ error: "Failed to update member role" });
  }
});

router.delete("/org/members/:userId", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const orgId = req.user!.orgId!;
  const targetUserId = req.params.userId as string;

  if (targetUserId === req.user!.id) {
    res.status(400).json({ error: "You cannot remove yourself from the organization" });
    return;
  }

  try {
    const [deleted] = await db
      .delete(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, targetUserId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to remove member");
    res.status(500).json({ error: "Failed to remove member" });
  }
});

router.get("/org/invites", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const orgId = req.user!.orgId;
  if (!orgId) {
    res.status(404).json({ error: "No organization found" });
    return;
  }

  try {
    const now = new Date();
    const invites = await db
      .select()
      .from(orgInvites)
      .where(
        and(
          eq(orgInvites.orgId, orgId),
          isNull(orgInvites.usedAt),
          gt(orgInvites.expiresAt, now),
        ),
      );

    res.json(invites);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch invites");
    res.status(500).json({ error: "Failed to fetch invites" });
  }
});

router.post("/org/invites", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const orgId = req.user!.orgId!;
  const userId = req.user!.id;
  const { email } = req.body;

  try {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [invite] = await db
      .insert(orgInvites)
      .values({
        orgId,
        token,
        email: email || null,
        createdByUserId: userId,
        expiresAt,
      })
      .returning();

    res.status(201).json(invite);
  } catch (err) {
    req.log.error({ err }, "Failed to create invite");
    res.status(500).json({ error: "Failed to create invite" });
  }
});

router.delete("/org/invites/:id", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const orgId = req.user!.orgId!;
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid invite id" });
    return;
  }

  try {
    const [deleted] = await db
      .delete(orgInvites)
      .where(and(eq(orgInvites.id, id), eq(orgInvites.orgId, orgId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Invite not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to revoke invite");
    res.status(500).json({ error: "Failed to revoke invite" });
  }
});

router.get("/join", async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) {
    res.redirect("/?error=missing-token");
    return;
  }

  if (!req.isAuthenticated()) {
    res.redirect(`/api/login?returnTo=/api/join?token=${encodeURIComponent(token)}`);
    return;
  }

  const userId = req.user!.id;

  try {
    const now = new Date();
    const [invite] = await db
      .select()
      .from(orgInvites)
      .where(
        and(
          eq(orgInvites.token, token),
          isNull(orgInvites.usedAt),
          gt(orgInvites.expiresAt, now),
        ),
      );

    if (!invite) {
      res.redirect("/?error=invalid-invite");
      return;
    }

    if (req.user!.orgId) {
      res.redirect("/dashboard?error=already-in-org");
      return;
    }

    await db.insert(orgMembers).values({
      orgId: invite.orgId,
      userId,
      role: "member",
    });

    await db
      .update(orgInvites)
      .set({ usedAt: now })
      .where(eq(orgInvites.id, invite.id));

    res.redirect("/dashboard");
  } catch (err) {
    req.log.error({ err }, "Failed to join org via invite");
    res.redirect("/?error=join-failed");
  }
});

export default router;
