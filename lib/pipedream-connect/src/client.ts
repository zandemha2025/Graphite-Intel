import type {
  PipedreamConnectConfig,
  PipedreamTokenResponse,
  PipedreamAccount,
  PipedreamActionResult,
  PullDataRequest,
} from "./types";

const DEFAULT_API_BASE = "https://api.pipedream.com";

// ---------------------------------------------------------------------------
// PipedreamConnectClient
// Thin wrapper around the Pipedream Connect REST API.
// Reads credentials from env vars unless overridden via config.
// ---------------------------------------------------------------------------

export class PipedreamConnectClient {
  private readonly projectId: string;
  private readonly projectSecret: string;
  readonly projectPublicKey: string;
  private readonly apiBase: string;

  constructor(config?: Partial<PipedreamConnectConfig>) {
    this.projectId = config?.projectId ?? requireEnv("PIPEDREAM_PROJECT_ID");
    this.projectSecret = config?.projectSecret ?? requireEnv("PIPEDREAM_PROJECT_SECRET");
    this.projectPublicKey = config?.projectPublicKey ?? requireEnv("PIPEDREAM_PROJECT_PUBLIC_KEY");
    this.apiBase = config?.apiBase ?? DEFAULT_API_BASE;
  }

  // -------------------------------------------------------------------------
  // Create a short-lived user token for the Pipedream Connect widget.
  // externalUserId should be a stable identifier for the end-user (e.g. userId).
  // -------------------------------------------------------------------------
  async createUserToken(externalUserId: string): Promise<PipedreamTokenResponse> {
    return this.post<PipedreamTokenResponse>(
      `/v1/connect/${this.projectId}/tokens`,
      { external_user_id: externalUserId },
    );
  }

  // -------------------------------------------------------------------------
  // List all connected accounts for this project (optionally filtered by user).
  // -------------------------------------------------------------------------
  async listAccounts(externalUserId?: string): Promise<PipedreamAccount[]> {
    const params = externalUserId
      ? `?external_user_id=${encodeURIComponent(externalUserId)}`
      : "";
    const data = await this.get<{ data: PipedreamAccount[] }>(
      `/v1/connect/${this.projectId}/accounts${params}`,
    );
    return data.data;
  }

  // -------------------------------------------------------------------------
  // Get a single connected account by ID.
  // -------------------------------------------------------------------------
  async getAccount(accountId: string): Promise<PipedreamAccount> {
    const data = await this.get<{ data: PipedreamAccount }>(
      `/v1/connect/${this.projectId}/accounts/${accountId}`,
    );
    return data.data;
  }

  // -------------------------------------------------------------------------
  // Disconnect (delete) a connected account.
  // -------------------------------------------------------------------------
  async disconnectAccount(accountId: string): Promise<void> {
    await this.delete(`/v1/connect/${this.projectId}/accounts/${accountId}`);
  }

  // -------------------------------------------------------------------------
  // Pull data by running a Pipedream action against a connected account.
  // accountId: the Pipedream account ID to use as auth context.
  // -------------------------------------------------------------------------
  async pullData(accountId: string, request: PullDataRequest): Promise<PipedreamActionResult> {
    return this.post<PipedreamActionResult>(
      `/v1/connect/${this.projectId}/actions`,
      {
        account_id: accountId,
        action_name: request.action,
        props: request.props ?? {},
      },
    );
  }

  // -------------------------------------------------------------------------
  // Internal HTTP helpers
  // -------------------------------------------------------------------------

  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.tokenExpiry) {
      return this.cachedToken;
    }
    const res = await fetch(`${this.apiBase}/v1/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: this.projectId,
        client_secret: this.projectSecret,
      }),
    });
    if (!res.ok) {
      throw new PipedreamApiError(res.status, `OAuth token request failed: ${res.status}`);
    }
    const data = await res.json() as { access_token: string; expires_in?: number };
    this.cachedToken = data.access_token;
    this.tokenExpiry = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
    return data.access_token;
  }

  private async authHeader(): Promise<string> {
    const token = await this.getAccessToken();
    return `Bearer ${token}`;
  }

  private async get<T>(path: string): Promise<T> {
    const auth = await this.authHeader();
    const res = await fetch(`${this.apiBase}${path}`, {
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        "X-PD-Environment": process.env.PIPEDREAM_ENVIRONMENT || "development",
      },
    });
    return parseResponse<T>(res);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const auth = await this.authHeader();
    const res = await fetch(`${this.apiBase}${path}`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        "X-PD-Environment": process.env.PIPEDREAM_ENVIRONMENT || "development",
      },
      body: JSON.stringify(body),
    });
    return parseResponse<T>(res);
  }

  private async delete(path: string): Promise<void> {
    const auth = await this.authHeader();
    const res = await fetch(`${this.apiBase}${path}`, {
      method: "DELETE",
      headers: { Authorization: auth },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new PipedreamApiError(res.status, text);
    }
  }
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class PipedreamApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Pipedream API error ${status}: ${body}`);
    this.name = "PipedreamApiError";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new PipedreamApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
