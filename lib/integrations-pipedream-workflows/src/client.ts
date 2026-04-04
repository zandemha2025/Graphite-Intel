import type {
  PipedreamWorkflowsConfig,
  PipedreamWorkflow,
  WorkflowDefinition,
  WorkflowExecution,
  OAuthTokenResponse,
} from "./types";

const DEFAULT_API_BASE = "https://api.pipedream.com";
const TOKEN_EXPIRY_BUFFER_MS = 60_000; // refresh 1 min before expiry

// ---------------------------------------------------------------------------
// PipedreamWorkflowsApiError
// ---------------------------------------------------------------------------

export class PipedreamWorkflowsApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Pipedream Workflows API error ${status}: ${body}`);
    this.name = "PipedreamWorkflowsApiError";
  }
}

// ---------------------------------------------------------------------------
// PipedreamWorkflowsClient
// Wraps the Pipedream REST API (/v1/) for workflow lifecycle management.
// Uses OAuth2 client credentials to authenticate.
// ---------------------------------------------------------------------------

export class PipedreamWorkflowsClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly apiBase: string;

  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config?: PipedreamWorkflowsConfig) {
    this.clientId = config?.clientId ?? requireEnv("PIPEDREAM_CLIENT_ID");
    this.clientSecret = config?.clientSecret ?? requireEnv("PIPEDREAM_CLIENT_SECRET");
    this.apiBase = config?.apiBase ?? DEFAULT_API_BASE;
  }

  // -------------------------------------------------------------------------
  // List all workflows for the authenticated project / user
  // -------------------------------------------------------------------------
  async listWorkflows(options?: { limit?: number; offset?: number }): Promise<PipedreamWorkflow[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    const qs = params.toString() ? `?${params}` : "";
    const data = await this.get<{ data: PipedreamWorkflow[] }>(`/v1/workflows${qs}`);
    return data.data ?? [];
  }

  // -------------------------------------------------------------------------
  // Get a single workflow by ID
  // -------------------------------------------------------------------------
  async getWorkflow(workflowId: string): Promise<PipedreamWorkflow> {
    const data = await this.get<{ data: PipedreamWorkflow }>(`/v1/workflows/${workflowId}`);
    return data.data;
  }

  // -------------------------------------------------------------------------
  // Create a new workflow from a WorkflowDefinition
  // -------------------------------------------------------------------------
  async createWorkflow(definition: WorkflowDefinition): Promise<PipedreamWorkflow> {
    const body = buildCreatePayload(definition);
    const data = await this.post<{ data: PipedreamWorkflow }>("/v1/workflows", body);
    return data.data;
  }

  // -------------------------------------------------------------------------
  // Deploy (activate) an existing workflow
  // -------------------------------------------------------------------------
  async deployWorkflow(workflowId: string): Promise<PipedreamWorkflow> {
    const data = await this.post<{ data: PipedreamWorkflow }>(
      `/v1/workflows/${workflowId}/deploy`,
      {},
    );
    return data.data;
  }

  // -------------------------------------------------------------------------
  // Update workflow — pause/resume/rename
  // -------------------------------------------------------------------------
  async updateWorkflow(
    workflowId: string,
    updates: { active?: boolean; name?: string; description?: string },
  ): Promise<PipedreamWorkflow> {
    const data = await this.patch<{ data: PipedreamWorkflow }>(
      `/v1/workflows/${workflowId}`,
      updates,
    );
    return data.data;
  }

  // -------------------------------------------------------------------------
  // Delete a workflow permanently
  // -------------------------------------------------------------------------
  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.delete(`/v1/workflows/${workflowId}`);
  }

  // -------------------------------------------------------------------------
  // Get execution history / event summaries for a workflow
  // -------------------------------------------------------------------------
  async getWorkflowLogs(workflowId: string, limit = 20): Promise<WorkflowExecution[]> {
    const data = await this.get<{ data: WorkflowExecution[] }>(
      `/v1/workflows/${workflowId}/event_summaries?limit=${limit}`,
    );
    return data.data ?? [];
  }

  // -------------------------------------------------------------------------
  // List connected accounts for an external user (wraps Connect API)
  // -------------------------------------------------------------------------
  async listConnectedAccounts(externalUserId: string): Promise<ConnectedAccount[]> {
    const data = await this.get<{ data: ConnectedAccount[] }>(
      `/v1/connect/accounts?external_user_id=${encodeURIComponent(externalUserId)}`,
    );
    return data.data ?? [];
  }

  // -------------------------------------------------------------------------
  // Internal: OAuth2 client credentials token management
  // -------------------------------------------------------------------------

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const res = await fetch(`${this.apiBase}/v1/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new PipedreamWorkflowsApiError(res.status, `OAuth token exchange failed: ${text}`);
    }

    const json = (await res.json()) as OAuthTokenResponse;
    this.cachedToken = json.access_token;
    this.tokenExpiresAt = now + json.expires_in * 1000 - TOKEN_EXPIRY_BUFFER_MS;
    return this.cachedToken;
  }

  private async authHeader(): Promise<string> {
    const token = await this.getAccessToken();
    return `Bearer ${token}`;
  }

  // -------------------------------------------------------------------------
  // HTTP helpers
  // -------------------------------------------------------------------------

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.apiBase}${path}`, {
      headers: {
        Authorization: await this.authHeader(),
        "Content-Type": "application/json",
      },
    });
    return parseResponse<T>(res);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.apiBase}${path}`, {
      method: "POST",
      headers: {
        Authorization: await this.authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return parseResponse<T>(res);
  }

  private async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.apiBase}${path}`, {
      method: "PATCH",
      headers: {
        Authorization: await this.authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return parseResponse<T>(res);
  }

  private async delete(path: string): Promise<void> {
    const res = await fetch(`${this.apiBase}${path}`, {
      method: "DELETE",
      headers: { Authorization: await this.authHeader() },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new PipedreamWorkflowsApiError(res.status, text);
    }
  }
}

// ---------------------------------------------------------------------------
// Connected account type (from Pipedream Connect API)
// ---------------------------------------------------------------------------

export interface ConnectedAccount {
  id: string;
  name: string;
  app: string; // Pipedream app slug
  healthy: boolean;
  dead: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Build the Pipedream REST API create-workflow payload from a WorkflowDefinition
// ---------------------------------------------------------------------------

function buildCreatePayload(definition: WorkflowDefinition): Record<string, unknown> {
  const trigger = buildTrigger(definition.trigger);
  const steps = definition.steps.map(buildStep);

  return {
    name: definition.name,
    description: definition.description,
    trigger,
    steps,
  };
}

function buildTrigger(trigger: WorkflowDefinition["trigger"]): Record<string, unknown> {
  if (trigger.type === "http") {
    return {
      type: "http",
      method: trigger.httpMethod ?? "POST",
    };
  }
  if (trigger.type === "schedule") {
    return {
      type: "cron",
      cron: trigger.schedule ?? "0 9 * * 1-5",
    };
  }
  // app_event
  return {
    type: "app",
    app: trigger.appSlug,
    event: trigger.eventType,
  };
}

function buildStep(step: WorkflowDefinition["steps"][number]): Record<string, unknown> {
  if (step.type === "code") {
    return {
      type: "code",
      name: step.id,
      code: step.code ?? "// custom step",
    };
  }
  return {
    type: "action",
    name: step.id,
    component: step.componentKey,
    props: step.props ?? {},
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new PipedreamWorkflowsApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
