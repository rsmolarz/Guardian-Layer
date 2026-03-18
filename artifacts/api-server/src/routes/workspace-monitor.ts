import { Router, type IRouter } from "express";
import { getGmailClient, getDriveClient, checkGoogleConnection } from "../lib/google-clients";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

interface ScanResult {
  id: string;
  source: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  detectedAt: string;
  metadata: Record<string, string>;
  aiAnalysis?: string;
}

let lastScanResults: ScanResult[] = [];
let lastScanAt: string | null = null;
let isScanning = false;

router.get("/workspace-monitor/status", async (_req, res): Promise<void> => {
  try {
    const gmailStatus = await checkGoogleConnection("google-mail");
    const driveStatus = await checkGoogleConnection("google-drive");

    res.json({
      gmail: gmailStatus,
      drive: driveStatus,
      lastScanAt,
      isScanning,
      resultsCount: lastScanResults.length,
      threats: lastScanResults.filter((r) => r.severity === "critical" || r.severity === "high").length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[workspace-monitor] GET /status failed:", message);
    res.status(500).json({ error: "Failed to get monitor status." });
  }
});

router.get("/workspace-monitor/results", async (_req, res): Promise<void> => {
  res.json({ results: lastScanResults, lastScanAt, isScanning });
});

router.post("/workspace-monitor/scan", async (_req, res): Promise<void> => {
  if (isScanning) {
    res.status(409).json({ error: "Scan already in progress." });
    return;
  }

  isScanning = true;
  const results: ScanResult[] = [];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent({ phase: "gmail", status: "scanning", message: "Scanning Gmail for threats..." });

    try {
      const gmail = await getGmailClient();

      const recentMessages = await gmail.users.messages.list({
        userId: "me",
        maxResults: 50,
        q: "newer_than:7d",
      });

      const messageIds = recentMessages.data.messages || [];
      sendEvent({ phase: "gmail", status: "processing", message: `Found ${messageIds.length} recent emails to analyze` });

      for (const msg of messageIds.slice(0, 20)) {
        try {
          const full = await gmail.users.messages.get({
            userId: "me",
            id: msg.id!,
            format: "metadata",
            metadataHeaders: ["From", "Subject", "Date", "Authentication-Results", "Received-SPF", "DKIM-Signature"],
          });

          const headers = full.data.payload?.headers || [];
          const getHeader = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

          const from = getHeader("From");
          const subject = getHeader("Subject");
          const date = getHeader("Date");
          const authResults = getHeader("Authentication-Results");
          const spf = getHeader("Received-SPF");

          const suspicious: string[] = [];

          if (authResults.includes("fail") || spf.includes("fail")) {
            suspicious.push("SPF/DKIM authentication failure");
          }

          const phishingKeywords = ["verify your account", "urgent action", "suspended", "click here immediately", "confirm your identity", "unusual activity", "security alert"];
          const subjectLower = subject.toLowerCase();
          for (const keyword of phishingKeywords) {
            if (subjectLower.includes(keyword)) {
              suspicious.push(`Phishing keyword detected: "${keyword}"`);
            }
          }

          if (from.includes("@") && !from.includes('"')) {
            const domain = from.split("@").pop()?.split(">")[0] || "";
            const suspiciousDomains = [".ru", ".cn", ".tk", ".ml", ".ga", ".cf"];
            for (const sd of suspiciousDomains) {
              if (domain.endsWith(sd)) {
                suspicious.push(`Suspicious sender domain: ${domain}`);
              }
            }
          }

          if (suspicious.length > 0) {
            results.push({
              id: `GMAIL-${msg.id}`,
              source: "Gmail",
              type: "email_threat",
              severity: suspicious.some((s) => s.includes("authentication failure")) ? "high" : "medium",
              title: `Suspicious email: ${subject.substring(0, 80)}`,
              description: suspicious.join("; "),
              detectedAt: date || new Date().toISOString(),
              metadata: { from, subject, messageId: msg.id! },
            });
          }
        } catch {
          // skip individual message errors
        }
      }

      const phishingSearch = await gmail.users.messages.list({
        userId: "me",
        maxResults: 10,
        q: "category:spam newer_than:7d",
      });

      const spamCount = phishingSearch.data.messages?.length || 0;
      if (spamCount > 5) {
        results.push({
          id: `GMAIL-SPAM-${Date.now()}`,
          source: "Gmail",
          type: "spam_surge",
          severity: "medium",
          title: `High spam volume detected: ${spamCount} spam emails in 7 days`,
          description: "Unusually high spam volume may indicate your email address has been leaked or is being targeted.",
          detectedAt: new Date().toISOString(),
          metadata: { spamCount: String(spamCount) },
        });
      }

      sendEvent({ phase: "gmail", status: "complete", message: `Gmail scan complete: ${results.length} threats found` });

    } catch (gmailErr: unknown) {
      const gmailMsg = gmailErr instanceof Error ? gmailErr.message : "Unknown";
      sendEvent({ phase: "gmail", status: "error", message: `Gmail scan failed: ${gmailMsg}` });
    }

    sendEvent({ phase: "drive", status: "scanning", message: "Scanning Google Drive for threats..." });

    try {
      const drive = await getDriveClient();

      const recentFiles = await drive.files.list({
        q: "modifiedTime > '" + new Date(Date.now() - 7 * 86400000).toISOString() + "'",
        fields: "files(id, name, mimeType, modifiedTime, sharingUser, shared, permissions)",
        pageSize: 50,
      });

      const files = recentFiles.data.files || [];
      sendEvent({ phase: "drive", status: "processing", message: `Found ${files.length} recently modified files` });

      for (const file of files) {
        if (file.shared) {
          results.push({
            id: `DRIVE-${file.id}`,
            source: "Google Drive",
            type: "shared_file",
            severity: "low",
            title: `Shared file detected: ${file.name}`,
            description: `File "${file.name}" is shared externally. Verify this is intentional.`,
            detectedAt: file.modifiedTime || new Date().toISOString(),
            metadata: { fileName: file.name || "", fileId: file.id || "", mimeType: file.mimeType || "" },
          });
        }

        const riskyExtensions = [".exe", ".bat", ".cmd", ".ps1", ".vbs", ".js", ".scr"];
        const name = (file.name || "").toLowerCase();
        for (const ext of riskyExtensions) {
          if (name.endsWith(ext)) {
            results.push({
              id: `DRIVE-EXEC-${file.id}`,
              source: "Google Drive",
              type: "executable_file",
              severity: "high",
              title: `Potentially malicious file: ${file.name}`,
              description: `File with executable extension "${ext}" detected in Google Drive. This could be malware.`,
              detectedAt: file.modifiedTime || new Date().toISOString(),
              metadata: { fileName: file.name || "", fileId: file.id || "" },
            });
            break;
          }
        }
      }

      sendEvent({ phase: "drive", status: "complete", message: `Drive scan complete` });

    } catch (driveErr: unknown) {
      const driveMsg = driveErr instanceof Error ? driveErr.message : "Unknown";
      sendEvent({ phase: "drive", status: "error", message: `Drive scan failed: ${driveMsg}` });
    }

    if (results.filter((r) => r.severity === "critical" || r.severity === "high").length > 0) {
      sendEvent({ phase: "ai", status: "analyzing", message: "Running AI analysis on detected threats..." });

      try {
        const threatSummary = results
          .filter((r) => r.severity === "critical" || r.severity === "high")
          .map((r) => `- [${r.severity.toUpperCase()}] ${r.title}: ${r.description}`)
          .join("\n");

        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          max_completion_tokens: 4096,
          messages: [
            {
              role: "system",
              content: "You are a cybersecurity analyst. Analyze these threats found in a Google Workspace scan and provide a brief assessment with recommended actions for each. Be concise but specific.",
            },
            {
              role: "user",
              content: `Analyze these threats found during a Google Workspace security scan:\n\n${threatSummary}`,
            },
          ],
        });

        const analysis = aiResponse.choices[0]?.message?.content || "";
        for (const r of results) {
          if (r.severity === "critical" || r.severity === "high") {
            r.aiAnalysis = analysis;
          }
        }

        sendEvent({ phase: "ai", status: "complete", message: "AI analysis complete" });
      } catch {
        sendEvent({ phase: "ai", status: "error", message: "AI analysis failed — results available without AI assessment" });
      }
    }

    lastScanResults = results;
    lastScanAt = new Date().toISOString();

    sendEvent({
      phase: "complete",
      status: "done",
      message: `Scan complete: ${results.length} items found, ${results.filter((r) => r.severity === "critical" || r.severity === "high").length} high/critical threats`,
      results,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    sendEvent({ phase: "error", status: "failed", message: `Scan failed: ${message}` });
  } finally {
    isScanning = false;
    res.end();
  }
});

export default router;
