/**
 * Google Drive provider — handles OAuth token exchange, file listing,
 * file download, and push notification (webhook) registration.
 *
 * Uses google-auth-library (already in package.json) for OAuth2 and
 * raw fetch for Drive v3 REST API to avoid the heavyweight googleapis SDK.
 */
import { OAuth2Client } from "google-auth-library";
import { logger } from "../logger";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
const REDIRECT_URI = `${API_BASE_URL}/api/integrations/oauth/google/callback`;

const DRIVE_API = "https://www.googleapis.com/drive/v3";

// Scopes we request
export const GOOGLE_DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

export function createOAuth2Client(): OAuth2Client {
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);
}

/** Build the consent URL the frontend redirects users to. */
export function buildAuthUrl(stateToken: string): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_DRIVE_SCOPES,
    state: stateToken,
  });
}

/** Exchange the one-time authorization code for access + refresh tokens. */
export async function exchangeCodeForTokens(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  return {
    accessToken: tokens.access_token ?? "",
    refreshToken: tokens.refresh_token ?? "",
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600_000),
    scope: tokens.scope ?? "",
  };
}

/** Refresh an expired access token using the stored refresh token. */
export async function refreshAccessToken(refreshToken: string) {
  const client = createOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return {
    accessToken: credentials.access_token ?? "",
    expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 3600_000),
  };
}

// ---------------------------------------------------------------------------
// User info
// ---------------------------------------------------------------------------

export async function getUserInfo(accessToken: string): Promise<{ email: string; name: string; picture?: string }> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch user info: ${res.status}`);
  const data = (await res.json()) as { email: string; name: string; picture?: string };
  return data;
}

// ---------------------------------------------------------------------------
// Drive API helpers
// ---------------------------------------------------------------------------

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  parents?: string[];
}

interface DriveListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

async function driveGet<T>(path: string, accessToken: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${DRIVE_API}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    logger.error({ status: res.status, body }, "Drive API error");
    throw new Error(`Drive API error ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

/** List folders in the user's Drive (or inside a specific parent). */
export async function listFolders(
  accessToken: string,
  parentId?: string,
): Promise<DriveFile[]> {
  const q = parentId
    ? `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    : "mimeType='application/vnd.google-apps.folder' and trashed=false";

  const data = await driveGet<DriveListResponse>("/files", accessToken, {
    q,
    fields: "files(id,name,mimeType,modifiedTime,webViewLink,parents),nextPageToken",
    pageSize: "200",
    orderBy: "name",
  });
  return data.files;
}

/** List all files inside a given folder (non-recursive). */
export async function listFilesInFolder(
  accessToken: string,
  folderId: string,
  pageToken?: string,
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const params: Record<string, string> = {
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id,name,mimeType,size,modifiedTime,webViewLink,parents),nextPageToken",
    pageSize: "100",
  };
  if (pageToken) params.pageToken = pageToken;
  return driveGet<DriveListResponse>("/files", accessToken, params);
}

/** List files changed since a given timestamp (for incremental sync). */
export async function listChangedFiles(
  accessToken: string,
  since: Date,
  pageToken?: string,
): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const params: Record<string, string> = {
    q: `modifiedTime > '${since.toISOString()}' and trashed=false`,
    fields: "files(id,name,mimeType,size,modifiedTime,webViewLink,parents),nextPageToken",
    pageSize: "100",
    orderBy: "modifiedTime desc",
  };
  if (pageToken) params.pageToken = pageToken;
  return driveGet<DriveListResponse>("/files", accessToken, params);
}

/** Download a file's content as a Buffer. Google Docs/Sheets are exported as PDF. */
export async function downloadFile(
  accessToken: string,
  fileId: string,
  mimeType: string,
): Promise<{ buffer: Buffer; exportedMimeType: string }> {
  const isGoogleDoc = mimeType.startsWith("application/vnd.google-apps.");

  let url: string;
  let exportedMimeType = mimeType;

  if (isGoogleDoc) {
    // Export Google Docs → PDF, Sheets → xlsx, Slides → PDF
    const exportMap: Record<string, string> = {
      "application/vnd.google-apps.document": "application/pdf",
      "application/vnd.google-apps.spreadsheet": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.google-apps.presentation": "application/pdf",
      "application/vnd.google-apps.drawing": "application/pdf",
    };
    exportedMimeType = exportMap[mimeType] ?? "application/pdf";
    url = `${DRIVE_API}/files/${fileId}/export?mimeType=${encodeURIComponent(exportedMimeType)}`;
  } else {
    url = `${DRIVE_API}/files/${fileId}?alt=media`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to download file ${fileId}: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), exportedMimeType };
}

// ---------------------------------------------------------------------------
// Webhooks (push notifications via Google Drive Changes API)
// ---------------------------------------------------------------------------

export interface WatchResponse {
  id: string;
  resourceId: string;
  resourceUri: string;
  expiration: string;
}

/**
 * Register a webhook channel for push notifications on changes.
 * Requires the app to have a publicly-accessible callback URL.
 */
export async function watchChanges(
  accessToken: string,
  channelId: string,
  webhookUrl: string,
  expiration?: number, // ms from now, max ~24h for Drive
): Promise<WatchResponse> {
  const startPageToken = await getStartPageToken(accessToken);

  const res = await fetch(`${DRIVE_API}/changes/watch?pageToken=${startPageToken}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: channelId,
      type: "web_hook",
      address: webhookUrl,
      expiration: expiration ? Date.now() + expiration : undefined,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to watch changes: ${res.status} ${body}`);
  }
  return (await res.json()) as WatchResponse;
}

/** Get the start page token needed for watching changes. */
export async function getStartPageToken(accessToken: string): Promise<string> {
  const data = await driveGet<{ startPageToken: string }>("/changes/startPageToken", accessToken, {});
  return data.startPageToken;
}

/** Stop a push notification channel. */
export async function stopChannel(
  accessToken: string,
  channelId: string,
  resourceId: string,
): Promise<void> {
  const res = await fetch(`${DRIVE_API}/channels/stop`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: channelId, resourceId }),
  });
  if (!res.ok) {
    logger.warn({ status: res.status }, "Failed to stop Drive channel (may already be expired)");
  }
}
