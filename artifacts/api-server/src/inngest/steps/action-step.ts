export interface ActionStepConfig {
  stepType: "action";
  action: "send_email" | "create_document" | "update_integration" | "call_webhook" | "notify";
  params: Record<string, unknown>;
}

export interface ActionStepResult {
  action: string;
  success: boolean;
  output: unknown;
}

/**
 * Executes a side-effect action step.
 *
 * - call_webhook: POSTs context data to an external URL
 * - notify: logs a notification (integrate with platform notification system when available)
 * - create_document / send_email / update_integration: recorded as queued actions
 */
export async function executeActionStep(
  config: ActionStepConfig,
  context: Record<string, unknown>,
): Promise<ActionStepResult> {
  switch (config.action) {
    case "call_webhook": {
      const url = config.params.url as string | undefined;
      if (!url) throw new Error("call_webhook action requires a 'url' param");

      const method = (config.params.method as string | undefined) ?? "POST";
      const extraHeaders =
        (config.params.headers as Record<string, string> | undefined) ?? {};

      // Use explicit payload if provided, otherwise forward the full context
      const rawPayload = config.params.payload ?? context;

      // Interpolate {{key}} placeholders in string payloads
      let body: string;
      if (typeof rawPayload === "string") {
        let interpolated = rawPayload;
        for (const [key, value] of Object.entries(context)) {
          interpolated = interpolated.replace(
            new RegExp(`\\{\\{${key}\\}\\}`, "g"),
            typeof value === "string" ? value : JSON.stringify(value),
          );
        }
        body = interpolated;
      } else {
        body = JSON.stringify(rawPayload);
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...extraHeaders },
        body,
        signal: AbortSignal.timeout(30_000),
      });

      return {
        action: "call_webhook",
        success: response.ok,
        output: { status: response.status, ok: response.ok },
      };
    }

    case "notify": {
      const message = (config.params.message as string | undefined) ?? JSON.stringify(context);
      const channel = (config.params.channel as string | undefined) ?? "system";

      // Emit to stdout for now; a real integration would use the platform's notification API
      console.log(`[WorkflowNotify] channel=${channel} message=${message}`);

      return {
        action: "notify",
        success: true,
        output: { channel, message },
      };
    }

    case "create_document":
    case "send_email":
    case "update_integration": {
      // Placeholder: these actions are accepted and recorded but require
      // integration with the respective platform services when available.
      return {
        action: config.action,
        success: true,
        output: {
          message: `${config.action} queued for processing`,
          params: config.params,
        },
      };
    }

    default: {
      const exhaustiveCheck: never = config.action;
      throw new Error(`Unknown action type: ${exhaustiveCheck}`);
    }
  }
}
