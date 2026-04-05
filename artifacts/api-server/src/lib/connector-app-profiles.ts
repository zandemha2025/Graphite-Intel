/**
 * App Profiles Registry
 *
 * Maps Pipedream app slugs to categories, default data-pull actions,
 * and sync intervals. Unknown apps fall back to GENERIC_FALLBACK.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AppCategory =
  | "crm"
  | "communication"
  | "analytics"
  | "support"
  | "marketing"
  | "ecommerce"
  | "payments"
  | "project-management"
  | "other";

export interface AppProfile {
  category: AppCategory;
  label: string;
  /** Actions to pull on sync — maps a logical key to the Pipedream component key + optional default props */
  defaultActions: AppProfileAction[];
  /** Suggested sync interval in minutes */
  syncIntervalMinutes: number;
}

export interface AppProfileAction {
  /** Human-readable key for this action */
  key: string;
  /** Pipedream action/component key passed to pullData */
  componentKey: string;
  label: string;
  /** Optional default props to send with the action */
  defaultProps?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// APP_PROFILES registry — maps app_slug to profile
// ---------------------------------------------------------------------------

export const APP_PROFILES: Record<string, AppProfile> = {
  // --- CRM ---
  salesforce_rest_api: {
    category: "crm",
    label: "Salesforce",
    defaultActions: [
      { key: "opportunities", componentKey: "salesforce_rest_api-get-opportunities", label: "Get Opportunities" },
      {
        key: "query",
        componentKey: "salesforce_rest_api-query",
        label: "SOQL Query",
        defaultProps: { query: "SELECT Id, Name, Email FROM Contact ORDER BY CreatedDate DESC LIMIT 200" },
      },
    ],
    syncIntervalMinutes: 60,
  },
  hubspot: {
    category: "crm",
    label: "HubSpot",
    defaultActions: [
      { key: "contacts", componentKey: "hubspot-get-contacts", label: "Get Contacts" },
      { key: "deals", componentKey: "hubspot-get-deals", label: "Get Deals" },
    ],
    syncIntervalMinutes: 60,
  },

  // --- Communication ---
  slack: {
    category: "communication",
    label: "Slack",
    defaultActions: [
      { key: "channels", componentKey: "slack-list-channels", label: "List Channels" },
      { key: "messages", componentKey: "slack-list-messages", label: "Recent Messages" },
    ],
    syncIntervalMinutes: 30,
  },
  gong: {
    category: "communication",
    label: "Gong",
    defaultActions: [
      { key: "calls", componentKey: "gong-list-calls", label: "List Calls" },
    ],
    syncIntervalMinutes: 120,
  },
  intercom: {
    category: "communication",
    label: "Intercom",
    defaultActions: [
      { key: "conversations", componentKey: "intercom-list-conversations", label: "List Conversations" },
      { key: "contacts", componentKey: "intercom-list-contacts", label: "List Contacts" },
    ],
    syncIntervalMinutes: 60,
  },

  // --- Analytics ---
  google_analytics: {
    category: "analytics",
    label: "Google Analytics 4",
    defaultActions: [
      { key: "report", componentKey: "google_analytics-run-report", label: "Run Report" },
    ],
    syncIntervalMinutes: 360,
  },
  google_search_console: {
    category: "analytics",
    label: "Google Search Console",
    defaultActions: [
      { key: "search_analytics", componentKey: "google_search_console-query-search-analytics", label: "Query Search Analytics" },
    ],
    syncIntervalMinutes: 360,
  },

  // --- Ads / Marketing ---
  facebook_ads: {
    category: "marketing",
    label: "Meta Ads",
    defaultActions: [
      { key: "campaigns", componentKey: "facebook_ads-list-campaigns", label: "List Campaigns" },
      { key: "insights", componentKey: "facebook_ads-get-insights", label: "Get Ad Insights" },
    ],
    syncIntervalMinutes: 120,
  },
  google_ads: {
    category: "marketing",
    label: "Google Ads",
    defaultActions: [
      { key: "campaigns", componentKey: "google_ads-list-campaigns", label: "List Campaigns" },
      { key: "stats", componentKey: "google_ads-get-campaign-stats", label: "Get Campaign Stats" },
    ],
    syncIntervalMinutes: 120,
  },
  tiktok_ads: {
    category: "marketing",
    label: "TikTok Ads",
    defaultActions: [
      { key: "campaign_report", componentKey: "tiktok_ads-get-campaign-report", label: "Get Campaign Report" },
    ],
    syncIntervalMinutes: 120,
  },
  linkedin_ads: {
    category: "marketing",
    label: "LinkedIn Ads",
    defaultActions: [
      { key: "analytics", componentKey: "linkedin_ads-get-analytics", label: "Get Analytics" },
    ],
    syncIntervalMinutes: 120,
  },
  klaviyo: {
    category: "marketing",
    label: "Klaviyo",
    defaultActions: [
      { key: "campaigns", componentKey: "klaviyo-get-campaigns", label: "Get Campaigns" },
      { key: "metrics", componentKey: "klaviyo-get-metrics", label: "Get Metrics" },
    ],
    syncIntervalMinutes: 120,
  },
  mailchimp: {
    category: "marketing",
    label: "Mailchimp",
    defaultActions: [
      { key: "campaigns", componentKey: "mailchimp-get-campaigns", label: "Get Campaigns" },
      { key: "reports", componentKey: "mailchimp-get-reports", label: "Get Reports" },
    ],
    syncIntervalMinutes: 120,
  },

  // --- Support ---
  zendesk: {
    category: "support",
    label: "Zendesk",
    defaultActions: [
      { key: "tickets", componentKey: "zendesk-list-tickets", label: "List Tickets" },
      { key: "users", componentKey: "zendesk-list-users", label: "List Users" },
    ],
    syncIntervalMinutes: 60,
  },

  // --- E-commerce ---
  shopify: {
    category: "ecommerce",
    label: "Shopify",
    defaultActions: [
      { key: "orders", componentKey: "shopify-get-orders", label: "Get Orders" },
      { key: "products", componentKey: "shopify-get-products", label: "Get Products" },
    ],
    syncIntervalMinutes: 120,
  },

  // --- Payments ---
  stripe: {
    category: "payments",
    label: "Stripe",
    defaultActions: [
      { key: "charges", componentKey: "stripe-list-charges", label: "List Charges" },
      { key: "customers", componentKey: "stripe-list-customers", label: "List Customers" },
    ],
    syncIntervalMinutes: 120,
  },

  // --- Project Management ---
  jira: {
    category: "project-management",
    label: "Jira",
    defaultActions: [
      { key: "issues", componentKey: "jira-list-issues", label: "List Issues" },
    ],
    syncIntervalMinutes: 60,
  },
  asana: {
    category: "project-management",
    label: "Asana",
    defaultActions: [
      { key: "tasks", componentKey: "asana-list-tasks", label: "List Tasks" },
    ],
    syncIntervalMinutes: 60,
  },
  notion: {
    category: "project-management",
    label: "Notion",
    defaultActions: [
      { key: "pages", componentKey: "notion-list-pages", label: "List Pages" },
    ],
    syncIntervalMinutes: 120,
  },
};

/** Fallback profile for any app slug not explicitly mapped */
export const GENERIC_FALLBACK: AppProfile = {
  category: "other",
  label: "Connected App",
  defaultActions: [],
  syncIntervalMinutes: 360,
};

// ---------------------------------------------------------------------------
// Profile lookup
// ---------------------------------------------------------------------------

export function getAppProfile(appSlug: string): AppProfile {
  return APP_PROFILES[appSlug] ?? GENERIC_FALLBACK;
}
