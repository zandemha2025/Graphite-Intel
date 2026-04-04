import { z } from "zod";

// ---------------------------------------------------------------------------
// Base types
// ---------------------------------------------------------------------------

export interface SerpApiOptions {
  /** ISO country code, e.g. "us" */
  gl?: string;
  /** Language code, e.g. "en" */
  hl?: string;
  /** Physical location string, e.g. "Austin, Texas" */
  location?: string;
  /** Number of results (Google supports 10, 20, 30, 40, 50, 100) */
  num?: number;
  /** Safe search: "active" | "off" */
  safe?: "active" | "off";
}

// ---------------------------------------------------------------------------
// Google Search types
// ---------------------------------------------------------------------------

export interface OrganicResult {
  position: number;
  title: string;
  link: string;
  displayed_link?: string;
  snippet?: string;
  favicon?: string;
  thumbnail?: string;
  date?: string;
  sitelinks?: { inline?: Array<{ title: string; link: string }> };
  rich_snippet?: Record<string, unknown>;
  source?: string;
}

export interface KnowledgeGraph {
  title?: string;
  type?: string;
  website?: string;
  description?: string;
  source?: { name: string; link: string };
  [key: string]: unknown;
}

export interface RelatedQuestion {
  question: string;
  snippet?: string;
  title?: string;
  link?: string;
}

export interface AnswerBox {
  type?: string;
  title?: string;
  answer?: string;
  snippet?: string;
  link?: string;
}

export interface GoogleSearchResult {
  search_metadata: {
    id: string;
    status: string;
    created_at: string;
    total_time_taken: number;
    google_url?: string;
  };
  search_parameters: {
    engine: "google";
    q: string;
    gl?: string;
    hl?: string;
    num?: number;
    location?: string;
  };
  organic_results: OrganicResult[];
  knowledge_graph?: KnowledgeGraph;
  related_questions?: RelatedQuestion[];
  answer_box?: AnswerBox;
  related_searches?: Array<{ query: string; link?: string }>;
  pagination?: { current: number; next?: string; other_pages?: Record<string, string> };
}

// ---------------------------------------------------------------------------
// Google Trends types
// ---------------------------------------------------------------------------

export interface TrendTimelineItem {
  date: string;
  timestamp: string;
  values: Array<{
    query: string;
    value: string;
    extracted_value: number;
  }>;
}

export interface RelatedTopic {
  topic: { value: string; title: string; type?: string };
  value: string;
  formattedValue?: string;
  hasData?: boolean;
  link?: string;
}

export interface RelatedQuery {
  query: string;
  value: string;
  formattedValue?: string;
  link?: string;
}

export interface GoogleTrendsResult {
  search_metadata: {
    id: string;
    status: string;
    created_at: string;
    total_time_taken: number;
  };
  search_parameters: {
    engine: "google_trends";
    q: string;
    date?: string;
    geo?: string;
    data_type?: string;
  };
  interest_over_time?: {
    timeline_data: TrendTimelineItem[];
    averages?: Array<{ query: string; value: number }>;
  };
  compared_breakdown_by_region?: Array<{
    geo: string;
    location: string;
    max_value_index: number;
    values: Array<{ query: string; value: string; extracted_value: number }>;
  }>;
  related_topics?: {
    rising?: RelatedTopic[];
    top?: RelatedTopic[];
  };
  related_queries?: {
    rising?: RelatedQuery[];
    top?: RelatedQuery[];
  };
}

// ---------------------------------------------------------------------------
// Google News types
// ---------------------------------------------------------------------------

export interface NewsResult {
  position: number;
  title: string;
  link: string;
  source: { name: string; icon?: string; authors?: string[] };
  date: string;
  snippet?: string;
  thumbnail?: string;
  story_token?: string;
}

export interface GoogleNewsResult {
  search_metadata: {
    id: string;
    status: string;
    created_at: string;
    total_time_taken: number;
  };
  search_parameters: {
    engine: "google_news";
    q: string;
    gl?: string;
    hl?: string;
  };
  news_results: NewsResult[];
}

// ---------------------------------------------------------------------------
// Google Shopping types
// ---------------------------------------------------------------------------

export interface ShoppingResult {
  position: number;
  title: string;
  link: string;
  product_link?: string;
  product_id?: string;
  source: string;
  price: string;
  extracted_price?: number;
  old_price?: string;
  extracted_old_price?: number;
  rating?: number;
  reviews?: number;
  thumbnail?: string;
  delivery?: string;
  store_rating?: number;
  store_reviews?: number;
  badge?: string;
  extensions?: string[];
}

export interface GoogleShoppingResult {
  search_metadata: {
    id: string;
    status: string;
    created_at: string;
    total_time_taken: number;
  };
  search_parameters: {
    engine: "google_shopping";
    q: string;
    gl?: string;
    hl?: string;
    num?: number;
  };
  shopping_results: ShoppingResult[];
  filters?: Array<{ type: string; options: Array<{ text: string; value?: string }> }>;
}

// ---------------------------------------------------------------------------
// SerpApiClient
// ---------------------------------------------------------------------------

const SERPAPI_BASE = "https://serpapi.com/search.json";

export class SerpApiClient {
  private readonly apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.SERPAPI_API_KEY;
    if (!key) {
      throw new Error(
        "SERPAPI_API_KEY must be set. Did you forget to provision the SerpAPI integration?",
      );
    }
    this.apiKey = key;
  }

  // -------------------------------------------------------------------------
  // Internal fetch helper
  // -------------------------------------------------------------------------

  private async fetch<T>(params: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(SERPAPI_BASE);
    url.searchParams.set("api_key", this.apiKey);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await globalThis.fetch(url.toString());
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new SerpApiError(response.status, body);
    }
    return response.json() as Promise<T>;
  }

  // -------------------------------------------------------------------------
  // Google Search
  // -------------------------------------------------------------------------

  /**
   * Perform a Google organic search.
   * Returns organic results, knowledge graph, related questions, and answer box.
   */
  async googleSearch(
    query: string,
    options: SerpApiOptions & { start?: number } = {},
  ): Promise<GoogleSearchResult> {
    return this.fetch<GoogleSearchResult>({
      engine: "google",
      q: query,
      gl: options.gl,
      hl: options.hl,
      location: options.location,
      num: options.num,
      safe: options.safe,
      start: options.start,
    });
  }

  // -------------------------------------------------------------------------
  // Google Trends
  // -------------------------------------------------------------------------

  /**
   * Fetch Google Trends data for one or more comma-separated queries.
   * @param dataType "TIMESERIES" | "GEO_MAP" | "RELATED_TOPICS" | "RELATED_QUERIES"
   */
  async googleTrends(
    query: string,
    options: {
      date?: string; // e.g. "today 12-m", "today 1-m", "2024-01-01 2024-12-31"
      geo?: string;  // e.g. "US", "GB"
      dataType?: "TIMESERIES" | "GEO_MAP" | "RELATED_TOPICS" | "RELATED_QUERIES";
      cat?: number;  // category ID
    } = {},
  ): Promise<GoogleTrendsResult> {
    return this.fetch<GoogleTrendsResult>({
      engine: "google_trends",
      q: query,
      date: options.date,
      geo: options.geo,
      data_type: options.dataType ?? "TIMESERIES",
      cat: options.cat,
    });
  }

  // -------------------------------------------------------------------------
  // Google News
  // -------------------------------------------------------------------------

  /**
   * Fetch Google News results for a query.
   */
  async googleNews(
    query: string,
    options: Pick<SerpApiOptions, "gl" | "hl"> & {
      /** Topic token for a specific news topic */
      topicToken?: string;
    } = {},
  ): Promise<GoogleNewsResult> {
    return this.fetch<GoogleNewsResult>({
      engine: "google_news",
      q: query,
      gl: options.gl,
      hl: options.hl,
      topic_token: options.topicToken,
    });
  }

  // -------------------------------------------------------------------------
  // Google Shopping
  // -------------------------------------------------------------------------

  /**
   * Fetch Google Shopping results for product price comparison.
   */
  async googleShopping(
    query: string,
    options: SerpApiOptions & {
      /** Sort order: "p_low_to_high" | "p_high_to_low" | "rv" | "pd" */
      tbs?: string;
      /** Google Shopping page token for pagination */
      pageToken?: string;
    } = {},
  ): Promise<GoogleShoppingResult> {
    return this.fetch<GoogleShoppingResult>({
      engine: "google_shopping",
      q: query,
      gl: options.gl,
      hl: options.hl,
      location: options.location,
      num: options.num,
      tbs: options.tbs,
      page_token: options.pageToken,
    });
  }
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class SerpApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`SerpAPI error ${status}: ${body}`);
    this.name = "SerpApiError";
  }
}

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------

let _client: SerpApiClient | null = null;

export function getSerpApiClient(): SerpApiClient {
  if (!_client) {
    _client = new SerpApiClient();
  }
  return _client;
}
