import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LogoutMobileSessionResponse } from "@workspace/api-zod";
import {
  clearSession,
  createSession,
  deleteSession,
  getSessionId,
  hashPassword,
  verifyPassword,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";

const router: IRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseCredentials(
  body: unknown,
): { email: string; password: string } | null {
  if (!body || typeof body !== "object") return null;
  const { email, password } = body as Record<string, unknown>;
  if (
    typeof email !== "string" ||
    !EMAIL_RE.test(email) ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    return null;
  }
  return { email: email.toLowerCase().trim(), password };
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

router.get("/auth/user", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.json({ user: null });
    return;
  }

  const { id, email, firstName, lastName, profileImageUrl, orgId, orgRole } =
    req.user;
  res.json({
    user: { id, email, firstName, lastName, profileImageUrl, orgId, orgRole },
  });
});

router.post("/signup", async (req: Request, res: Response) => {
  const creds = parseCredentials(req.body);
  if (!creds) {
    res.status(400).json({ error: "Invalid email or password (min 8 chars)" });
    return;
  }

  const { email, password } = creds;
  const rawName = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const nameParts = rawName.split(/\s+/);
  const firstName = nameParts[0] || null;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash, firstName, lastName })
    .returning();

  const sessionData: SessionData = {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    },
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.status(201).json({
    user: sessionData.user,
  });
});

router.post("/login", async (req: Request, res: Response) => {
  const creds = parseCredentials(req.body);
  if (!creds) {
    res.status(400).json({ error: "Invalid email or password" });
    return;
  }

  const { email, password } = creds;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const sessionData: SessionData = {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    },
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.json({ user: sessionData.user });
});

router.post("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ success: true });
});

// GET logout for browser redirects (e.g. direct navigation to /api/logout)
router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.redirect("/");
});

// Mobile: invalidate a session by Bearer token
router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

export default router;
