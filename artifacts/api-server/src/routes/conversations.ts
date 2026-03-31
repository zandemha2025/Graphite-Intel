import { Router, type IRouter, type Request, type Response } from "express";
import { db, conversations, messages, companyProfiles, documents, conversationDocuments } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function conversationFilter(req: Request) {
  const userId = req.user!.id;
  const orgId = req.user!.orgId;
  if (orgId) {
    return eq(conversations.orgId, orgId);
  }
  return eq(conversations.userId, userId);
}

const BASE_SYSTEM_PROMPT = `You are Stratix, an elite AI strategic advisor serving C-suite executives (CMOs, CEOs, CFOs) at top-tier companies.

You deliver McKinsey-quality strategic insight in every response:
- Data-driven analysis backed by market research, industry benchmarks, and case studies
- Confident, direct executive communication — no hedging or filler
- Specific, actionable recommendations with clear next steps
- Citation of real companies, market data, and industry research
- Structured responses using headers, bullet points, and numbered lists when helpful
- Quantified impact where possible (revenue, market share, growth rates, ROI)

Your expertise spans: market strategy, competitive intelligence, growth frameworks, brand positioning, financial analysis, organizational design, digital transformation, and M&A strategy.

Always respond as a senior partner would in a client engagement — authoritative, incisive, and immediately valuable.`;

async function buildSystemPrompt(req: Request, conversationId?: number): Promise<string> {
  const userId = req.user!.id;
  const orgId = req.user!.orgId;

  const filter = orgId
    ? eq(companyProfiles.orgId, orgId)
    : eq(companyProfiles.userId, userId);

  const [profile] = await db
    .select()
    .from(companyProfiles)
    .where(filter);

  let prompt = BASE_SYSTEM_PROMPT;

  if (profile) {
    const contextBlock = `

CLIENT CONTEXT (always reference this when relevant):
- Company: ${profile.companyName}
- Industry: ${profile.industry}
- Stage: ${profile.stage}
- Revenue Range: ${profile.revenueRange}
${profile.competitors ? `- Key Competitors: ${profile.competitors}` : ""}
${profile.strategicPriorities ? `- Strategic Priorities: ${profile.strategicPriorities}` : ""}
${profile.researchSummary ? `\nCompany Intelligence (AI-researched):\n${profile.researchSummary}` : ""}

Always tailor your advice to this specific company context. Reference their industry, stage, and competitive landscape where relevant.`;
    prompt += contextBlock;
  }

  if (conversationId) {
    const links = await db
      .select()
      .from(conversationDocuments)
      .where(eq(conversationDocuments.conversationId, conversationId));

    if (links.length > 0) {
      const docIds = links.map((l) => l.documentId);
      const docs = await db
        .select()
        .from(documents)
        .where(inArray(documents.id, docIds));

      const readyDocs = docs.filter((d) => d.status === "ready" && d.extractedText);
      if (readyDocs.length > 0) {
        const MAX_CHARS_PER_DOC = Math.floor(80000 / readyDocs.length);
        const docBlocks = readyDocs.map((d) => {
          const text = (d.extractedText || "").slice(0, MAX_CHARS_PER_DOC);
          return `--- Document: "${d.title}" ---\n${text}\n--- End of "${d.title}" ---`;
        });

        prompt += `

ATTACHED DOCUMENTS (the user has provided these documents as context for this conversation):
${docBlocks.join("\n\n")}

When answering questions, draw from these documents where relevant. At the end of your response, include a brief "Sources:" line listing which documents you referenced (e.g., "Sources: Q3 Board Deck, Financial Model").`;
      }
    }
  }

  return prompt;
}

router.get("/openai/conversations", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  try {
    const convos = await db
      .select()
      .from(conversations)
      .where(conversationFilter(req))
      .orderBy(desc(conversations.createdAt))
      .limit(50);

    res.json(convos);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch conversations");
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.post("/openai/conversations", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const userId = req.user!.id;
  const orgId = req.user!.orgId;
  const title = req.body.title || "New Engagement";

  try {
    const [convo] = await db
      .insert(conversations)
      .values({ userId, ...(orgId !== undefined && { orgId }), title })
      .returning();

    res.json(convo);
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

router.get("/openai/conversations/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid conversation id" });
    return;
  }

  try {
    const [convo] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), conversationFilter(req)));

    if (!convo) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    res.json({ ...convo, messages: msgs });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch conversation");
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

router.delete("/openai/conversations/:id", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid conversation id" });
    return;
  }

  try {
    const [deleted] = await db
      .delete(conversations)
      .where(and(eq(conversations.id, id), conversationFilter(req)))
      .returning();

    if (!deleted) {
      res.status(404).send();
      return;
    }

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete conversation");
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.post(
  "/openai/conversations/:id/messages",
  async (req: Request, res: Response) => {
    if (!requireAuth(req, res)) return;

    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid conversation id" });
      return;
    }

    const { content } = req.body;
    if (!content || typeof content !== "string") {
      res.status(400).json({ error: "content is required" });
      return;
    }

    try {
      const [convo] = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, id), conversationFilter(req)));

      if (!convo) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      await db.insert(messages).values({
        conversationId: id,
        role: "user",
        content,
      });

      if (convo.title === "New Engagement" || convo.title === "New Conversation") {
        const shortTitle = content.substring(0, 60).trim();
        await db
          .update(conversations)
          .set({ title: shortTitle })
          .where(eq(conversations.id, id));
      }

      const allMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, id))
        .orderBy(messages.createdAt);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const sendEvent = (event: string, data: unknown) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      const chatMessages = allMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const systemPrompt = await buildSystemPrompt(req, id);
      let fullResponse = "";

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatMessages,
        ],
        stream: true,
        max_tokens: 4096,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          fullResponse += delta;
          sendEvent("content", { delta });
        }
      }

      const [assistantMsg] = await db
        .insert(messages)
        .values({
          conversationId: id,
          role: "assistant",
          content: fullResponse,
        })
        .returning();

      sendEvent("complete", { message: assistantMsg });
      res.end();
    } catch (err) {
      req.log.error({ err }, "Failed to send message");
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`);
      res.end();
    }
  },
);

export default router;
