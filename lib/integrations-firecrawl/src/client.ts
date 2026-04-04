import { z } from "zod";

const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev";

function getApiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    throw new Error(
      "FIRECRAWL_API_KEY must be set. Did you forget to set the Firecrawl API key?",
    );
  }
  return key;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${FIRECRAWL_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firecrawl ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${FIRECRAWL_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firecrawl ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface PageMetadata {
  title?: string;
  description?: string;
  url?: string;
  statusCode?: number;
  [key: string]: unknown;
}

export interface ScrapeResult {
  markdown: string;
  metadata: PageMetadata;
}

export interface CrawlOptions {
  maxDepth?: number;
  limit?: number;
}

export interface CrawlResult {
  urls: string[];
  pages: ScrapeResult[];
}

/**
 * Scrape a single URL and return markdown content + metadata.
 */
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const data = await postJson<{ data: ScrapeResult }>("/v1/scrape", {
    url,
    formats: ["markdown"],
  });
  return data.data;
}

/**
 * Crawl an entire site. Polls until the job completes.
 */
export async function crawlSite(
  url: string,
  options: CrawlOptions = {},
): Promise<CrawlResult> {
  const { id } = await postJson<{ id: string }>("/v1/crawl", {
    url,
    maxDepth: options.maxDepth ?? 2,
    limit: options.limit ?? 10,
    formats: ["markdown"],
  });

  for (;;) {
    await new Promise((r) => setTimeout(r, 2000));
    const status = await getJson<{
      status: string;
      data?: ScrapeResult[];
    }>(`/v1/crawl/${id}`);

    if (status.status === "completed") {
      const pages = status.data ?? [];
      return {
        urls: pages.map((p) => String(p.metadata.url ?? "")).filter(Boolean),
        pages,
      };
    }
    if (status.status === "failed") {
      throw new Error(`Crawl job ${id} failed`);
    }
  }
}

/**
 * Extract structured data from a URL using a Zod schema.
 * The schema is converted to JSON Schema and sent to Firecrawl's extract endpoint.
 */
export async function extractData<T>(
  url: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const jsonSchema = z.toJSONSchema(schema);
  const data = await postJson<{ data: T }>("/v1/extract", {
    urls: [url],
    schema: jsonSchema,
  });
  return data.data;
}

/**
 * Extract structured data using a raw JSON schema object.
 * Useful when calling from HTTP routes where the schema arrives as JSON.
 */
export async function extractDataRaw(
  url: string,
  schema: Record<string, unknown>,
): Promise<unknown> {
  const data = await postJson<{ data: unknown }>("/v1/extract", {
    urls: [url],
    schema,
  });
  return data.data;
}

/**
 * Get a sitemap of all URLs on a site.
 */
export async function mapSite(url: string): Promise<string[]> {
  const data = await postJson<{ links?: string[] }>("/v1/map", { url });
  return data.links ?? [];
}
