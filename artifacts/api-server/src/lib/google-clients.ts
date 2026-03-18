import { google } from "googleapis";

interface ConnectionSettings {
  settings: {
    expires_at?: string;
    access_token?: string;
    oauth?: { credentials?: { access_token?: string } };
  };
}

const connectionCache: Record<string, { settings: ConnectionSettings; token: string } | null> = {};

function extractToken(settings: ConnectionSettings): string | null {
  return (
    settings?.settings?.access_token ||
    settings?.settings?.oauth?.credentials?.access_token ||
    null
  );
}

async function getAccessToken(connectorName: string): Promise<string> {
  const cached = connectionCache[connectorName];
  if (
    cached &&
    cached.settings.settings.expires_at &&
    new Date(cached.settings.settings.expires_at).getTime() > Date.now()
  ) {
    return cached.token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("X-Replit-Token not found for repl/depl");
  }

  const res = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=${connectorName}`,
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Connector API returned ${res.status} for ${connectorName}`);
  }

  const data = await res.json();
  const settings = data.items?.[0] as ConnectionSettings | undefined;

  if (!settings) {
    throw new Error(`${connectorName} not connected`);
  }

  const accessToken = extractToken(settings);
  if (!accessToken) {
    throw new Error(`No access token found for ${connectorName}`);
  }

  connectionCache[connectorName] = { settings, token: accessToken };
  return accessToken;
}

function createOAuth2Client(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

export async function getGmailClient() {
  const token = await getAccessToken("google-mail");
  return google.gmail({ version: "v1", auth: createOAuth2Client(token) });
}

export async function getDriveClient() {
  const token = await getAccessToken("google-drive");
  return google.drive({ version: "v3", auth: createOAuth2Client(token) });
}

export async function getCalendarClient() {
  const token = await getAccessToken("google-calendar");
  return google.calendar({ version: "v3", auth: createOAuth2Client(token) });
}

export async function getDocsClient() {
  const token = await getAccessToken("google-docs");
  return google.docs({ version: "v1", auth: createOAuth2Client(token) });
}

export async function getSheetsClient() {
  const token = await getAccessToken("google-sheet");
  return google.sheets({ version: "v4", auth: createOAuth2Client(token) });
}

export async function checkGoogleConnection(connectorName: string): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    await getAccessToken(connectorName);
    return { connected: true };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}
