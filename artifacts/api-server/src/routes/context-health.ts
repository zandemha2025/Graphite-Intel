import { Router, type IRouter, type Request, type Response } from "express";
import { db, companyProfiles, documents, pipedreamConnectors, integrations } from "@workspace/db";
import { eq, sql, count, max } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

interface HealthBreakdown {
  profile: number;
  documents: number;
  connections: number;
  definitions: number;
  freshness: number;
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
}

router.get("/context/health", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const userId = req.user!.id;
  const orgId = req.user!.orgId;

  try {
    // Fetch profile
    const profileFilter = orgId
      ? eq(companyProfiles.orgId, orgId)
      : eq(companyProfiles.userId, userId);

    const [profile] = await db
      .select()
      .from(companyProfiles)
      .where(profileFilter);

    // Count documents
    const docFilter = orgId
      ? eq(documents.orgId, orgId)
      : eq(documents.userId, userId);

    const [docResult] = await db
      .select({ total: count() })
      .from(documents)
      .where(docFilter);
    const docCount = Number(docResult?.total ?? 0);

    // Count connections (pipedream + integrations)
    let connectionCount = 0;
    let latestSync: Date | null = null;
    const connectedTypes: string[] = [];

    if (orgId) {
      const [pdResult] = await db
        .select({ total: count(), latest: max(pipedreamConnectors.lastUsedAt) })
        .from(pipedreamConnectors)
        .where(eq(pipedreamConnectors.orgId, orgId));

      const [intResult] = await db
        .select({ total: count(), latest: max(integrations.lastSyncAt) })
        .from(integrations)
        .where(eq(integrations.orgId, orgId));

      connectionCount =
        Number(pdResult?.total ?? 0) + Number(intResult?.total ?? 0);

      // Get connected types for suggestions
      const pdTypes = await db
        .select({ appSlug: pipedreamConnectors.appSlug })
        .from(pipedreamConnectors)
        .where(eq(pipedreamConnectors.orgId, orgId));
      const intTypes = await db
        .select({ type: integrations.type })
        .from(integrations)
        .where(eq(integrations.orgId, orgId));

      connectedTypes.push(
        ...pdTypes.map((r) => r.appSlug),
        ...intTypes.map((r) => r.type),
      );

      if (pdResult?.latest) latestSync = new Date(pdResult.latest);
      if (intResult?.latest) {
        const intDate = new Date(intResult.latest);
        if (!latestSync || intDate > latestSync) latestSync = intDate;
      }
    }

    // Calculate profile completeness
    const profileFields = {
      name: !!profile?.companyName,
      industry: !!profile?.industry,
      stage: !!profile?.stage,
      revenue: !!profile?.revenueRange,
      competitors: !!(profile?.competitors && profile.competitors.trim()),
      priorities: !!(
        profile?.strategicPriorities && profile.strategicPriorities.trim()
      ),
      researchSummary: !!(
        profile?.researchSummary && profile.researchSummary.trim()
      ),
    };

    const fieldCount = Object.values(profileFields).filter(Boolean).length;
    const profileScore = Math.round((fieldCount / 7) * 30);

    // Document score
    let documentScore = 0;
    if (docCount >= 20) documentScore = 25;
    else if (docCount >= 5) documentScore = 20;
    else if (docCount >= 1) documentScore = 10;

    // Connection score
    let connectionScore = 0;
    if (connectionCount >= 4) connectionScore = 20;
    else if (connectionCount >= 2) connectionScore = 15;
    else if (connectionCount >= 1) connectionScore = 10;

    // Freshness score
    let freshnessScore = 0;
    if (latestSync) {
      const hours =
        (Date.now() - latestSync.getTime()) / (1000 * 60 * 60);
      if (hours < 24) freshnessScore = 10;
      else if (hours < 168) freshnessScore = 5;
    }

    // Note: definitions are client-side only for now, so we set 0 here
    // The client will overlay its own definition count
    const definitionsScore = 0;

    const breakdown: HealthBreakdown = {
      profile: profileScore,
      documents: documentScore,
      connections: connectionScore,
      definitions: definitionsScore,
      freshness: freshnessScore,
    };

    const score =
      breakdown.profile +
      breakdown.documents +
      breakdown.connections +
      breakdown.definitions +
      breakdown.freshness;

    // Build suggestions
    const suggestions: Suggestion[] = [];

    if (!profileFields.competitors) {
      suggestions.push({
        id: "add-competitors",
        title: "Add your top competitors",
        description:
          "Competitor data helps the AI benchmark your strategy.",
      });
    }
    if (docCount === 0) {
      suggestions.push({
        id: "upload-doc",
        title: "Upload a strategy document",
        description:
          "Documents ground AI answers in your actual data.",
      });
    }
    if (connectionCount === 0) {
      suggestions.push({
        id: "connect-source",
        title: "Connect a data source",
        description:
          "Live data lets the AI analyze real-time metrics.",
      });
    }
    if (!profileFields.priorities) {
      suggestions.push({
        id: "set-priorities",
        title: "Set your strategic priorities",
        description:
          "Priorities help the AI rank recommendations.",
      });
    }

    res.json({
      score,
      breakdown,
      suggestions,
      meta: {
        profileFields,
        docCount,
        connectionCount,
        connectedTypes,
        lastSyncAt: latestSync?.toISOString() ?? null,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to compute context health");
    res.status(500).json({ error: "Failed to compute context health" });
  }
});

export default router;
