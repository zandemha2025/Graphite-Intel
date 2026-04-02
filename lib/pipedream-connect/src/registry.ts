import type { DataSource } from "./types";

// ---------------------------------------------------------------------------
// DataSourceRegistry
// Maps each platform to its Pipedream app slug and available actions.
// Action keys are stable identifiers used when calling pullData().
// ---------------------------------------------------------------------------

export interface DataSourceMeta {
  /** Pipedream app slug — used in Connect OAuth flow */
  appSlug: string;
  /** Human-readable display name */
  label: string;
  /** Available data-pull actions */
  actions: Record<string, DataSourceAction>;
}

export interface DataSourceAction {
  /** Pipedream component key */
  componentKey: string;
  label: string;
  description: string;
}

export const DATA_SOURCE_REGISTRY: Record<DataSource, DataSourceMeta> = {
  ga4: {
    appSlug: "google_analytics",
    label: "Google Analytics 4",
    actions: {
      run_report: {
        componentKey: "google_analytics-run-report",
        label: "Run Report",
        description: "Run a GA4 data report for a given date range and metrics",
      },
      realtime_report: {
        componentKey: "google_analytics-run-realtime-report",
        label: "Realtime Report",
        description: "Fetch real-time active users and events",
      },
    },
  },

  meta_ads: {
    appSlug: "facebook_ads",
    label: "Meta Ads",
    actions: {
      get_insights: {
        componentKey: "facebook_ads-get-insights",
        label: "Get Ad Insights",
        description: "Retrieve campaign, ad set, or ad performance metrics",
      },
      list_campaigns: {
        componentKey: "facebook_ads-list-campaigns",
        label: "List Campaigns",
        description: "List all ad campaigns in the account",
      },
    },
  },

  google_ads: {
    appSlug: "google_ads",
    label: "Google Ads",
    actions: {
      get_campaign_stats: {
        componentKey: "google_ads-get-campaign-stats",
        label: "Get Campaign Stats",
        description: "Retrieve performance stats for campaigns",
      },
      list_campaigns: {
        componentKey: "google_ads-list-campaigns",
        label: "List Campaigns",
        description: "List all campaigns in the account",
      },
    },
  },

  shopify: {
    appSlug: "shopify",
    label: "Shopify",
    actions: {
      get_orders: {
        componentKey: "shopify-get-orders",
        label: "Get Orders",
        description: "List orders with status and financial details",
      },
      get_products: {
        componentKey: "shopify-get-products",
        label: "Get Products",
        description: "List products and inventory levels",
      },
    },
  },

  stripe: {
    appSlug: "stripe",
    label: "Stripe",
    actions: {
      list_charges: {
        componentKey: "stripe-list-charges",
        label: "List Charges",
        description: "Retrieve recent charges and their statuses",
      },
      list_customers: {
        componentKey: "stripe-list-customers",
        label: "List Customers",
        description: "Retrieve customer records",
      },
    },
  },

  hubspot: {
    appSlug: "hubspot",
    label: "HubSpot",
    actions: {
      get_contacts: {
        componentKey: "hubspot-get-contacts",
        label: "Get Contacts",
        description: "Retrieve CRM contacts with properties",
      },
      get_deals: {
        componentKey: "hubspot-get-deals",
        label: "Get Deals",
        description: "Retrieve deals pipeline data",
      },
    },
  },

  salesforce: {
    appSlug: "salesforce_rest_api",
    label: "Salesforce",
    actions: {
      query: {
        componentKey: "salesforce_rest_api-query",
        label: "SOQL Query",
        description: "Run a SOQL query against Salesforce objects",
      },
      get_opportunities: {
        componentKey: "salesforce_rest_api-get-opportunities",
        label: "Get Opportunities",
        description: "Retrieve opportunity records",
      },
    },
  },

  tiktok_ads: {
    appSlug: "tiktok_ads",
    label: "TikTok Ads",
    actions: {
      get_campaign_report: {
        componentKey: "tiktok_ads-get-campaign-report",
        label: "Get Campaign Report",
        description: "Retrieve campaign performance metrics",
      },
    },
  },

  linkedin_ads: {
    appSlug: "linkedin_ads",
    label: "LinkedIn Ads",
    actions: {
      get_analytics: {
        componentKey: "linkedin_ads-get-analytics",
        label: "Get Analytics",
        description: "Retrieve ad analytics for campaigns",
      },
    },
  },

  klaviyo: {
    appSlug: "klaviyo",
    label: "Klaviyo",
    actions: {
      get_metrics: {
        componentKey: "klaviyo-get-metrics",
        label: "Get Metrics",
        description: "Retrieve email/SMS performance metrics",
      },
      get_campaigns: {
        componentKey: "klaviyo-get-campaigns",
        label: "Get Campaigns",
        description: "List email and SMS campaigns",
      },
    },
  },

  mailchimp: {
    appSlug: "mailchimp",
    label: "Mailchimp",
    actions: {
      get_campaigns: {
        componentKey: "mailchimp-get-campaigns",
        label: "Get Campaigns",
        description: "List email campaigns with stats",
      },
      get_reports: {
        componentKey: "mailchimp-get-reports",
        label: "Get Reports",
        description: "Retrieve campaign reports including opens and clicks",
      },
    },
  },

  google_search_console: {
    appSlug: "google_search_console",
    label: "Google Search Console",
    actions: {
      query_search_analytics: {
        componentKey: "google_search_console-query-search-analytics",
        label: "Query Search Analytics",
        description: "Get search performance data: impressions, clicks, CTR, position",
      },
    },
  },
};

export function getDataSourceMeta(source: DataSource): DataSourceMeta {
  return DATA_SOURCE_REGISTRY[source];
}

export function getAppSlug(source: DataSource): string {
  return DATA_SOURCE_REGISTRY[source].appSlug;
}
