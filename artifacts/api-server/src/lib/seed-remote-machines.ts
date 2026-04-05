import crypto from "crypto";
import { db, remoteMachinesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const raw = process.env.DATABASE_URL || "gl-remote-fallback-key";
  return crypto.createHash("sha256").update(raw).digest();
}

function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted;
}

const DEMO_MACHINES = [
  {
    name: "prod-web-01",
    hostname: "10.0.1.10",
    port: 22,
    username: "deploy",
    authMethod: "key",
    os: "linux",
    osVersion: "Ubuntu 22.04.3 LTS",
    tags: "production,web,frontend",
    active: true,
  },
  {
    name: "prod-db-master",
    hostname: "10.0.1.20",
    port: 22,
    username: "dbadmin",
    authMethod: "key",
    os: "linux",
    osVersion: "Debian 12.4 (bookworm)",
    tags: "production,database,primary",
    active: true,
  },
  {
    name: "prod-api-01",
    hostname: "10.0.1.30",
    port: 22,
    username: "deploy",
    authMethod: "key",
    os: "linux",
    osVersion: "Rocky Linux 9.3",
    tags: "production,api,backend",
    active: true,
  },
  {
    name: "staging-web-01",
    hostname: "10.0.2.10",
    port: 22,
    username: "deploy",
    authMethod: "password",
    os: "linux",
    osVersion: "Ubuntu 24.04 LTS",
    tags: "staging,web",
    active: true,
  },
  {
    name: "monitoring-node",
    hostname: "10.0.1.50",
    port: 2222,
    username: "monitor",
    authMethod: "key",
    os: "linux",
    osVersion: "Alpine Linux 3.19",
    tags: "production,monitoring,grafana",
    active: true,
  },
  {
    name: "build-server",
    hostname: "10.0.3.10",
    port: 22,
    username: "ci",
    authMethod: "key",
    os: "linux",
    osVersion: "Ubuntu 22.04.3 LTS",
    tags: "ci-cd,build,internal",
    active: true,
  },
  {
    name: "dev-macos-runner",
    hostname: "10.0.4.5",
    port: 22,
    username: "runner",
    authMethod: "key",
    os: "macos",
    osVersion: "macOS 14.2 Sonoma",
    tags: "development,macos,ios-build",
    active: false,
  },
  {
    name: "edge-proxy-eu",
    hostname: "10.0.5.10",
    port: 22,
    username: "admin",
    authMethod: "key",
    os: "linux",
    osVersion: "Debian 12.4 (bookworm)",
    tags: "production,edge,eu-west,proxy",
    active: true,
  },
];

export async function seedRemoteMachines() {
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(remoteMachinesTable);

  if ((countResult?.count ?? 0) > 0) return;

  console.log("[seed] Adding demo remote machines...");

  const now = new Date();
  const machines = DEMO_MACHINES.map((m) => ({
    ...m,
    encryptedCredential: encrypt(m.authMethod === "key" ? "demo-ssh-private-key-placeholder" : "demo-password"),
    lastSeen: m.active ? new Date(now.getTime() - Math.random() * 3600000) : null,
    lastMaintenanceAt: m.active ? new Date(now.getTime() - Math.random() * 86400000 * 7) : null,
  }));

  await db.insert(remoteMachinesTable).values(machines);
  console.log(`[seed] ${machines.length} demo machines registered.`);
}
