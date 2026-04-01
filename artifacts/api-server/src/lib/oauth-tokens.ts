/**
 * Centralized OAuth token refresh utility.
 * Before any provider API call, pass the integration through ensureFreshToken()
 * to transparently refresh expired credentials and persist the new token.
 */
import { db, integrations } from "@workspace/db";
import { eq } from "drizzle-orm";
import { refreshAccessToken as refreshGoogleToken } from "./providers/google-drive";
import { logger } from "./logger";

// Buffer: refresh if token expires within this many ms
const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

interface Integration {
  id: number;
  type: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
}

/**
 * Ensures the integration has a valid (non-expired) access token.
 * If expired or about to expire, uses the refresh token to get a new one
 * and persists it to the DB.
 *
 * Returns the current valid access token.
 */
export async function ensureFreshToken(integration: Integration): Promise<string> {
  if (!integration.accessToken) {
    throw new Error(`Integration ${integration.id} has no access token`);
  }

  // Check if token is still valid
  if (integration.tokenExpiresAt) {
    const expiresAt = new Date(integration.tokenExpiresAt).getTime();
    if (expiresAt - Date.now() > EXPIRY_BUFFER_MS) {
      return integration.accessToken;
    }
  }

  // Token is expired or about to expire — refresh it
  if (!integration.refreshToken) {
    throw new Error(`Integration ${integration.id} has no refresh token and access token is expired`);
  }

  logger.info({ integrationId: integration.id, type: integration.type }, "Refreshing expired OAuth token");

  let newAccessToken: string;
  let newExpiresAt: Date;

  switch (integration.type) {
    case "google_drive": {
      const result = await refreshGoogleToken(integration.refreshToken);
      newAccessToken = result.accessToken;
      newExpiresAt = result.expiresAt;
      break;
    }
    // Future providers go here:
    // case "sharepoint": { ... }
    // case "dropbox": { ... }
    default:
      throw new Error(`Unsupported integration type for token refresh: ${integration.type}`);
  }

  // Persist refreshed token
  await db
    .update(integrations)
    .set({
      accessToken: newAccessToken,
      tokenExpiresAt: newExpiresAt,
    })
    .where(eq(integrations.id, integration.id));

  return newAccessToken;
}
