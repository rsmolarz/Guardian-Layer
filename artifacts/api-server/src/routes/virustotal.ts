import { Router, type IRouter } from "express";
import { logActivity } from "../lib/activity-logger";

const router: IRouter = Router();

const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY || "";
const VT_BASE = "https://www.virustotal.com/api/v3";

async function vtFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${VT_BASE}${path}`, {
    ...options,
    headers: {
      "x-apikey": VT_API_KEY,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return res;
}

function summarizeStats(stats: Record<string, number> | undefined) {
  if (!stats) return { malicious: 0, suspicious: 0, harmless: 0, undetected: 0, total: 0, verdict: "unknown" as const };
  const malicious = stats.malicious || 0;
  const suspicious = stats.suspicious || 0;
  const harmless = stats.harmless || 0;
  const undetected = stats.undetected || 0;
  const total = malicious + suspicious + harmless + undetected;
  const verdict = malicious > 0 ? "malicious" as const : suspicious > 0 ? "suspicious" as const : "clean" as const;
  return { malicious, suspicious, harmless, undetected, total, verdict };
}

router.post("/virustotal/scan-url", async (req, res) => {
  try {
    if (!VT_API_KEY) {
      return res.status(503).json({ error: "VirusTotal API key not configured" });
    }

    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL is required" });
    }

    const submitRes = await vtFetch("/urls", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `url=${encodeURIComponent(url)}`,
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      return res.status(submitRes.status).json({ error: `VirusTotal error: ${errText}` });
    }

    const submitData = await submitRes.json();
    const analysisId = submitData.data?.id;

    if (!analysisId) {
      return res.status(500).json({ error: "No analysis ID returned" });
    }

    await new Promise(r => setTimeout(r, 3000));

    const analysisRes = await vtFetch(`/analyses/${analysisId}`);
    const analysisData = await analysisRes.json();

    const attrs = analysisData.data?.attributes || {};
    const stats = summarizeStats(attrs.stats);
    const engines = attrs.results || {};

    const detections = Object.entries(engines)
      .filter(([_, r]: any) => r.category === "malicious" || r.category === "suspicious")
      .map(([engine, r]: any) => ({
        engine,
        category: r.category,
        result: r.result || "detected",
      }));

    logActivity({
      action: "virustotal_url_scan",
      category: "endpoint_security",
      source: "virustotal",
      detail: `URL scan: ${url} — verdict: ${stats.verdict} (${stats.malicious} malicious, ${stats.suspicious} suspicious)`,
      severity: stats.verdict === "malicious" ? "critical" : stats.verdict === "suspicious" ? "high" : "info",
    });

    return res.json({
      type: "url",
      target: url,
      analysisId,
      status: attrs.status || "completed",
      stats,
      detections,
      scannedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/virustotal/scan-hash", async (req, res) => {
  try {
    if (!VT_API_KEY) {
      return res.status(503).json({ error: "VirusTotal API key not configured" });
    }

    const { hash } = req.body;
    if (!hash || typeof hash !== "string") {
      return res.status(400).json({ error: "File hash (MD5, SHA-1, or SHA-256) is required" });
    }

    const cleanHash = hash.trim().toLowerCase();
    if (!/^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{64}$/.test(cleanHash)) {
      return res.status(400).json({ error: "Invalid hash format. Provide MD5 (32 chars), SHA-1 (40 chars), or SHA-256 (64 chars)" });
    }

    const fileRes = await vtFetch(`/files/${cleanHash}`);

    if (fileRes.status === 404) {
      return res.json({
        type: "file",
        target: cleanHash,
        status: "not_found",
        stats: { malicious: 0, suspicious: 0, harmless: 0, undetected: 0, total: 0, verdict: "unknown" },
        detections: [],
        fileInfo: null,
        scannedAt: new Date().toISOString(),
      });
    }

    if (!fileRes.ok) {
      const errText = await fileRes.text();
      return res.status(fileRes.status).json({ error: `VirusTotal error: ${errText}` });
    }

    const fileData = await fileRes.json();
    const attrs = fileData.data?.attributes || {};
    const stats = summarizeStats(attrs.last_analysis_stats);

    const engines = attrs.last_analysis_results || {};
    const detections = Object.entries(engines)
      .filter(([_, r]: any) => r.category === "malicious" || r.category === "suspicious")
      .map(([engine, r]: any) => ({
        engine,
        category: r.category,
        result: r.result || "detected",
      }));

    const fileInfo = {
      name: attrs.meaningful_name || attrs.names?.[0] || null,
      size: attrs.size || 0,
      type: attrs.type_description || attrs.type_tag || null,
      md5: attrs.md5 || null,
      sha1: attrs.sha1 || null,
      sha256: attrs.sha256 || null,
      firstSeen: attrs.first_submission_date ? new Date(attrs.first_submission_date * 1000).toISOString() : null,
      lastAnalysis: attrs.last_analysis_date ? new Date(attrs.last_analysis_date * 1000).toISOString() : null,
    };

    logActivity({
      action: "virustotal_hash_scan",
      category: "endpoint_security",
      source: "virustotal",
      detail: `File hash scan: ${cleanHash.substring(0, 12)}... — verdict: ${stats.verdict} (${stats.malicious} malicious)`,
      severity: stats.verdict === "malicious" ? "critical" : stats.verdict === "suspicious" ? "high" : "info",
    });

    return res.json({
      type: "file",
      target: cleanHash,
      status: "completed",
      stats,
      detections,
      fileInfo,
      scannedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/virustotal/scan-ip", async (req, res) => {
  try {
    if (!VT_API_KEY) {
      return res.status(503).json({ error: "VirusTotal API key not configured" });
    }

    const { ip } = req.body;
    if (!ip || typeof ip !== "string") {
      return res.status(400).json({ error: "IP address is required" });
    }

    const cleanIp = ip.trim();
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(cleanIp) && !/^[a-fA-F0-9:]+$/.test(cleanIp)) {
      return res.status(400).json({ error: "Invalid IP address format" });
    }

    const ipRes = await vtFetch(`/ip_addresses/${cleanIp}`);

    if (!ipRes.ok) {
      const errText = await ipRes.text();
      return res.status(ipRes.status).json({ error: `VirusTotal error: ${errText}` });
    }

    const ipData = await ipRes.json();
    const attrs = ipData.data?.attributes || {};
    const stats = summarizeStats(attrs.last_analysis_stats);

    const engines = attrs.last_analysis_results || {};
    const detections = Object.entries(engines)
      .filter(([_, r]: any) => r.category === "malicious" || r.category === "suspicious")
      .map(([engine, r]: any) => ({
        engine,
        category: r.category,
        result: r.result || "detected",
      }));

    const ipInfo = {
      country: attrs.country || null,
      asOwner: attrs.as_owner || null,
      asn: attrs.asn || null,
      network: attrs.network || null,
      reputation: attrs.reputation ?? null,
      lastHttpsCert: attrs.last_https_certificate?.subject?.CN || null,
    };

    logActivity({
      action: "virustotal_ip_scan",
      category: "endpoint_security",
      source: "virustotal",
      detail: `IP scan: ${cleanIp} — verdict: ${stats.verdict} (${stats.malicious} malicious) — ${ipInfo.asOwner || "unknown AS"}`,
      severity: stats.verdict === "malicious" ? "critical" : stats.verdict === "suspicious" ? "high" : "info",
    });

    return res.json({
      type: "ip",
      target: cleanIp,
      status: "completed",
      stats,
      detections,
      ipInfo,
      scannedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/virustotal/scan-domain", async (req, res) => {
  try {
    if (!VT_API_KEY) {
      return res.status(503).json({ error: "VirusTotal API key not configured" });
    }

    const { domain } = req.body;
    if (!domain || typeof domain !== "string") {
      return res.status(400).json({ error: "Domain is required" });
    }

    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    const domainRes = await vtFetch(`/domains/${cleanDomain}`);

    if (!domainRes.ok) {
      const errText = await domainRes.text();
      return res.status(domainRes.status).json({ error: `VirusTotal error: ${errText}` });
    }

    const domainData = await domainRes.json();
    const attrs = domainData.data?.attributes || {};
    const stats = summarizeStats(attrs.last_analysis_stats);

    const engines = attrs.last_analysis_results || {};
    const detections = Object.entries(engines)
      .filter(([_, r]: any) => r.category === "malicious" || r.category === "suspicious")
      .map(([engine, r]: any) => ({
        engine,
        category: r.category,
        result: r.result || "detected",
      }));

    const domainInfo = {
      registrar: attrs.registrar || null,
      creation_date: attrs.creation_date ? new Date(attrs.creation_date * 1000).toISOString() : null,
      reputation: attrs.reputation ?? null,
      categories: attrs.categories || {},
      lastDnsRecords: (attrs.last_dns_records || []).slice(0, 10),
    };

    logActivity({
      action: "virustotal_domain_scan",
      category: "endpoint_security",
      source: "virustotal",
      detail: `Domain scan: ${cleanDomain} — verdict: ${stats.verdict} (${stats.malicious} malicious)`,
      severity: stats.verdict === "malicious" ? "critical" : stats.verdict === "suspicious" ? "high" : "info",
    });

    return res.json({
      type: "domain",
      target: cleanDomain,
      status: "completed",
      stats,
      detections,
      domainInfo,
      scannedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
