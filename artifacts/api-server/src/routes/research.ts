import { Router, type IRouter, type Request, type Response } from "express";
import { db, companyProfiles } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOpenAIClient } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

const RESEARCH_PROMPT = `You are a world-class business intelligence analyst. You have been given the content of a company's website. Your task is to extract comprehensive information about this company and generate a strategic intelligence profile.

Analyze the website content carefully and extract the following:

1. **Company Name**: The official company name
2. **Industry**: Choose the most fitting from: "Technology / SaaS", "Fintech / Financial Services", "Healthcare / Biotech", "Consumer / Retail", "Media / Entertainment", "Enterprise Software", "E-commerce", "Real Estate", "Manufacturing / Industrial", "Professional Services", "Education", "Other"
3. **Stage**: Choose one from: "Pre-seed", "Seed", "Series A", "Series B", "Series C+", "Growth", "Public", "Enterprise"
4. **Revenue Range**: Choose one from: "Pre-revenue", "<$1M", "$1M–$10M", "$10M–$50M", "$50M–$200M", "$200M–$1B", "$1B+"
5. **Competitors**: Known or inferred competitors based on the company's market position and offering (comma-separated list)
6. **Strategic Priorities**: Key strategic initiatives, goals, or priorities evident from the website
7. **Research Summary**: A rich, narrative paragraph (150-250 words) summarizing the company's positioning, value proposition, key differentiators, target market, business model, and any notable signals (funding, growth, product launches, partnerships). This should read like the opening brief from a McKinsey partner who just researched the client.
8. **Follow-up Questions**: Generate 3-5 tailored questions the AI could NOT answer from the website alone — things that would significantly improve strategic advice quality. Focus on what's ambiguous or missing. Examples: fundraising status, specific growth targets, key decision-maker priorities, recent pivots, biggest internal challenges. Frame as natural conversation, not a form.

Return ONLY valid JSON in this exact structure:
{
  "companyName": "string",
  "industry": "string",
  "stage": "string",
  "revenueRange": "string",
  "competitors": "string",
  "strategicPriorities": "string",
  "researchSummary": "string",
  "followUpQuestions": ["string", "string", "string"]
}

If you cannot determine a field with confidence, make a reasonable inference based on context clues. Do not leave fields empty.`;

router.post("/research/company", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { url } = req.body;
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "url is required" });
    return;
  }

  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent("status", { message: "Reading your website..." });

    const jinaUrl = `https://r.jina.ai/${normalizedUrl}`;
    let websiteContent = "";
    try {
      const jinaRes = await fetch(jinaUrl, {
        headers: {
          "Accept": "text/plain",
          "X-Return-Format": "markdown",
        },
        signal: AbortSignal.timeout(20000),
      });
      if (jinaRes.ok) {
        websiteContent = await jinaRes.text();
        if (websiteContent.length > 20000) {
          websiteContent = websiteContent.substring(0, 20000);
        }
      } else {
        websiteContent = `Website URL: ${normalizedUrl}`;
      }
    } catch {
      websiteContent = `Website URL: ${normalizedUrl}`;
    }

    sendEvent("status", { message: "Analyzing your market position..." });

    await new Promise((r) => setTimeout(r, 800));

    sendEvent("status", { message: "Mapping your competitive landscape..." });

    await new Promise((r) => setTimeout(r, 600));

    sendEvent("status", { message: "Identifying strategic signals..." });

    const userPrompt = `Website URL: ${normalizedUrl}

Website Content:
${websiteContent}

Extract the company intelligence profile as JSON.`;

    const completion = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: RESEARCH_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2048,
    });

    sendEvent("status", { message: "Building your intelligence profile..." });

    const rawJson = completion.choices[0]?.message?.content || "{}";
    let profile: {
      companyName: string;
      industry: string;
      stage: string;
      revenueRange: string;
      competitors: string;
      strategicPriorities: string;
      researchSummary: string;
      followUpQuestions: string[];
    };

    try {
      profile = JSON.parse(rawJson);
    } catch {
      sendEvent("error", { error: "Failed to parse AI response" });
      res.end();
      return;
    }

    await new Promise((r) => setTimeout(r, 500));

    sendEvent("complete", {
      companyName: profile.companyName || "",
      industry: profile.industry || "Other",
      stage: profile.stage || "Growth",
      revenueRange: profile.revenueRange || "Pre-revenue",
      competitors: profile.competitors || "",
      strategicPriorities: profile.strategicPriorities || "",
      researchSummary: profile.researchSummary || "",
      followUpQuestions: Array.isArray(profile.followUpQuestions) ? profile.followUpQuestions : [],
    });
  } catch (err) {
    req.log.error({ err }, "Research pipeline failed");
    sendEvent("error", { error: "Research pipeline failed. Please try again." });
  } finally {
    res.end();
  }
});

export default router;
