import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Supported data source platforms
// ---------------------------------------------------------------------------

export const DATA_SOURCES = [
  "ga4",
  "meta_ads",
  "google_ads",
  "shopify",
  "stripe",
  "hubspot",
  "salesforce",
  "tiktok_ads",
  "linkedin_ads",
  "klaviyo",
  "mailchimp",
  "google_search_console",
] as const;

export type DataSource = (typeof DATA_SOURCES)[number];

// ---------------------------------------------------------------------------
// Pipedream Connect API types
// ---------------------------------------------------------------------------

export interface PipedreamTokenResponse {
  token: string;
  expires_at: string;
}

export interface PipedreamAccount {
  id: string;
  name: string;
  app: string; // Pipedream app slug
  healthy: boolean;
  dead: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipedreamActionResult {
  id: string;
  data: unknown;
  exports: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Client config
// ---------------------------------------------------------------------------

export interface PipedreamConnectConfig {
  projectId: string;
  projectSecret: string;
  projectPublicKey: string;
  apiBase?: string; // defaults to https://api.pipedream.com
}

// ---------------------------------------------------------------------------
// Pull-data request
// ---------------------------------------------------------------------------

export const pullDataRequestSchema = z.object({
  action: z.string().min(1), // e.g. "ga4-get-report"
  props: z.record(z.string(), z.unknown()).optional(),
});

export type PullDataRequest = z.infer<typeof pullDataRequestSchema>;
