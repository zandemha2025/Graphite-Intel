import { Router, type IRouter, type Request, type Response } from "express";
import { db, conversations, messages, companyProfiles, documents, conversationDocuments, documentChunks } from "@workspace/db";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { getOpenAIClient } from "@workspace/integrations-openai-ai-server";
import OpenAI from "openai";
import {
  type DataSource,
  type SourceResult,
  classifyQueryIntent,
  fetchPerplexityResearch,
  fetchSerpApiData,
  fetchCrmData,
  fetchCallData,
  buildFusionContext,
  buildFusionSources,
} from "../lib/data-fusion";

const router: IRouter = Router();

// Perplexity client for deep research (has built-in web search — used by deep research mode)
function getPerplexityClient(): OpenAI | null {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return null;
  return new OpenAI({
    apiKey: key,
    baseURL: "https://api.perplexity.ai",
  });
}

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

type RetrievedChunk = {
  id: number;
  documentId: number;
  chunkIndex: number;
  text: string;
  documentTitle: string;
  similarity: number;
};

async function retrieveRelevantChunks(query: string, docIds: number[]): Promise<RetrievedChunk[]> {
  if (docIds.length === 0) return [];

  const embeddingResponse = await getOpenAIClient().embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const results = await db.execute(sql`
    SELECT
      dc.id,
      dc.document_id AS "documentId",
      dc.chunk_index AS "chunkIndex",
      dc.text,
      d.title AS "documentTitle",
      1 - (dc.embedding <=> ${embeddingStr}::vector) AS similarity
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE dc.document_id = ANY(${docIds}::int[])
      AND dc.embedding IS NOT NULL
      AND 1 - (dc.embedding <=> ${embeddingStr}::vector) > 0.3
    ORDER BY dc.embedding <=> ${embeddingStr}::vector
    LIMIT 12
  `);

  return results.rows as RetrievedChunk[];
}

async function buildSystemPrompt(
  req: Request,
  conversationId?: number,
  query?: string,
): Promise<{ prompt: string; retrievedChunks: RetrievedChunk[] }> {
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

  let retrievedChunks: RetrievedChunk[] = [];

  if (conversationId) {
    const links = await db
      .select()
      .from(conversationDocuments)
      .where(eq(conversationDocuments.conversationId, conversationId));

    if (links.length > 0) {
      const docIds = links.map((l) => l.documentId);
      const linkedDocs = await db
        .select()
        .from(documents)
        .where(inArray(documents.id, docIds));

      const readyDocs = linkedDocs.filter((d) => d.status === "ready");

      if (readyDocs.length > 0) {
        const readyDocIds = readyDocs.map((d) => d.id);

        if (query) {
          retrievedChunks = await retrieveRelevantChunks(query, readyDocIds);
        }

        if (retrievedChunks.length > 0) {
          const chunkBlocks = retrievedChunks.map((chunk, idx) =>
            `[Source ${idx + 1}: "${chunk.documentTitle}", chunk ${chunk.chunkIndex + 1}]\n${chunk.text}`
          ).join("\n\n---\n\n");

          prompt += `

RETRIEVED DOCUMENT CONTEXT (semantically relevant to the user's query):
${chunkBlocks}

When answering, cite specific documents by name using the format [Doc: Document Title]. Only cite documents when you actually draw from their content. Use inline citations like [Doc: Board Deck Q3] within your response.`;
        } else if (readyDocs.some((d) => !d.chunkCount || d.chunkCount === 0)) {
          const unindexedDocs = readyDocs.filter((d) => !d.chunkCount || d.chunkCount === 0);
          const MAX_CHARS_PER_DOC = Math.floor(80000 / unindexedDocs.length);
          const docBlocks = unindexedDocs.map((d) => {
            const text = (d.extractedText || "").slice(0, MAX_CHARS_PER_DOC);
            return `--- Document: "${d.title}" ---\n${text}\n--- End of "${d.title}" ---`;
          });

          prompt += `

ATTACHED DOCUMENTS (not yet semantically indexed — full text provided):
${docBlocks.join("\n\n")}

When answering questions, draw from these documents where relevant. Cite specific documents by name using [Doc: Document Title] format.`;
        }
      }
    }
  }

  return { prompt, retrievedChunks };
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

  const id = parseInt(req.params.id as string);
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

  const id = parseInt(req.params.id as string);
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
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid conversation id" });
      return;
    }

    const { content, research_depth } = req.body;
    if (!content || typeof content !== "string") {
      res.status(400).json({ error: "content is required" });
      return;
    }
    const isDeepResearch = research_depth === "deep";
    const isQuickResearch = research_depth === "quick";

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

      if (convo.title === "New Engagement" || convo.title === "New Conversation" || convo.title === "New Session") {
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

      // ---------------------------------------------------------------
      // Step 0: Build base system prompt + retrieve document chunks
      // ---------------------------------------------------------------
      const { prompt: systemPrompt, retrievedChunks } = await buildSystemPrompt(req, id, content);

      // ---------------------------------------------------------------
      // Step 1: Classify query intent (fast — gpt-4o-mini, ~100 tokens)
      // ---------------------------------------------------------------
      sendEvent("step", { label: "Classifying query intent...", source: "Graphite" });

      // Grab profile for the classifier
      const orgId = req.user!.orgId;
      const profileFilter = orgId
        ? eq(companyProfiles.orgId, orgId)
        : eq(companyProfiles.userId, userId);
      const [profile] = await db.select().from(companyProfiles).where(profileFilter);

      const sourcesToUse = await classifyQueryIntent(content, profile ?? null);
      sendEvent("step_complete", { label: "Query classified", sources: sourcesToUse });

      // ---------------------------------------------------------------
      // Step 2: Parallel data fetching based on classification
      // ---------------------------------------------------------------
      const searchPromises: Promise<SourceResult>[] = [];

      if (sourcesToUse.includes("WEB_RESEARCH")) {
        sendEvent("step", { label: "Searching web research...", source: "Perplexity" });
        searchPromises.push(fetchPerplexityResearch(content, profile ?? null));
      }

      if (sourcesToUse.includes("SEARCH_DATA")) {
        sendEvent("step", { label: "Pulling search data...", source: "SerpAPI" });
        searchPromises.push(fetchSerpApiData(content));
      }

      if (sourcesToUse.includes("CRM_DATA")) {
        sendEvent("step", { label: "Checking CRM data...", source: "Salesforce" });
        searchPromises.push(fetchCrmData(req, content));
      }

      if (sourcesToUse.includes("CALL_DATA")) {
        sendEvent("step", { label: "Analyzing call data...", source: "Gong" });
        searchPromises.push(fetchCallData(req, content));
      }

      const settledResults = await Promise.allSettled(searchPromises);
      const successfulResults = settledResults
        .filter(
          (r): r is PromiseFulfilledResult<SourceResult> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value);

      // Send step_complete for each fetched source
      for (const r of successfulResults) {
        if (r.data) {
          sendEvent("step_complete", { label: `${r.source} complete`, source: r.source });
        }
      }

      // ---------------------------------------------------------------
      // Step 3: Build enriched system prompt with fusion context
      // ---------------------------------------------------------------
      let enrichedPrompt = systemPrompt;

      const fusionContext = buildFusionContext(successfulResults);
      if (fusionContext) {
        enrichedPrompt += `\n\nDATA FUSION CONTEXT (automatically gathered from multiple sources):\n${fusionContext}\n\nWhen responding, cite which source provided each piece of information using [Source: Name] format. Distinguish between 1st-party data (company's own systems) and 3rd-party research.`;
      }

      // Send aggregated sources to frontend
      const fusionSources = buildFusionSources(
        successfulResults,
        retrievedChunks.length > 0,
        !!profile,
      );
      if (fusionSources.length > 0) {
        sendEvent("sources", { sources: fusionSources });
      }

      // ---------------------------------------------------------------
      // Step 4: Call the main LLM with enriched context
      // ---------------------------------------------------------------
      sendEvent("step", { label: "Synthesizing insights...", source: "AI" });

      // Deep research still uses Perplexity as the primary LLM for its
      // built-in web search. Standard/quick use OpenAI with fusion context.
      const perplexity = isDeepResearch ? getPerplexityClient() : null;
      const llmClient = perplexity || getOpenAIClient();
      const llmModel = perplexity ? "sonar-pro" : "gpt-4o";

      const finalSystemContent = isDeepResearch
        ? enrichedPrompt +
          "\n\nIMPORTANT: The user has requested DEEP RESEARCH mode. You have access to real-time web search. Provide an extremely thorough, comprehensive, and detailed response with current data. Include multiple perspectives, cite sources where possible, cover edge cases, and structure your response with clear sections and subsections. Leave no stone unturned."
        : isQuickResearch
          ? enrichedPrompt +
            "\n\nBe concise and direct. Provide a brief, focused answer without unnecessary elaboration."
          : enrichedPrompt;

      let fullResponse = "";

      const stream = await (llmClient as any).chat.completions.create({
        model: llmModel,
        messages: [
          { role: "system", content: finalSystemContent },
          ...chatMessages,
        ],
        stream: true,
        max_tokens: isDeepResearch ? 8192 : isQuickResearch ? 1024 : 4096,
        temperature: isDeepResearch ? 0.3 : 0.7,
      });

      for await (const chunk of stream as any) {
        const delta = (chunk as any).choices[0]?.delta?.content || "";
        if (delta) {
          fullResponse += delta;
          sendEvent("content", { delta });
        }
      }

      // ---------------------------------------------------------------
      // Step 5: Persist assistant message
      // ---------------------------------------------------------------
      const docSourcesData = retrievedChunks.length > 0
        ? retrievedChunks.map((chunk) => ({
            documentId: chunk.documentId,
            documentTitle: chunk.documentTitle,
            chunkIndex: chunk.chunkIndex,
            snippet: chunk.text.slice(0, 200),
            similarity: chunk.similarity,
          }))
        : null;

      const [assistantMsg] = await db
        .insert(messages)
        .values({
          conversationId: id,
          role: "assistant",
          content: fullResponse,
          sources: docSourcesData,
        })
        .returning();

      if (docSourcesData) {
        sendEvent("sources", { sources: docSourcesData });
      }

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
