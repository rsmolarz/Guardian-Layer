import { Router, type IRouter } from "express";
import { threatIntelLimiter } from "../middleware/rate-limiter";

const router: IRouter = Router();

router.use("/threat-intel", threatIntelLimiter);

const FETCH_TIMEOUT_MS = 15000;

function timedFetch(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function getApiKey(name: string): string | undefined {
  return process.env[name];
}

function missingKeyResponse(res: any, service: string, envVar: string) {
  res.status(200).json({
    configured: false,
    service,
    message: `${service} API key not configured. Set the ${envVar} environment variable to enable this feature.`,
    setupUrl: getSetupUrl(service),
  });
}

function getSetupUrl(service: string): string {
  const urls: Record<string, string> = {
    VirusTotal: "https://www.virustotal.com/gui/join-us",
    AbuseIPDB: "https://www.abuseipdb.com/register",
    Shodan: "https://account.shodan.io/register",
    "Have I Been Pwned": "https://haveibeenpwned.com/API/Key",
  };
  return urls[service] || "";
}

router.get("/threat-intel/status", async (_req, res): Promise<void> => {
  res.json({
    services: {
      virustotal: { configured: !!getApiKey("VIRUSTOTAL_API_KEY"), name: "VirusTotal", description: "URL & file scanning against 70+ antivirus engines" },
      abuseipdb: { configured: !!getApiKey("ABUSEIPDB_API_KEY"), name: "AbuseIPDB", description: "IP address reputation & abuse reports" },
      shodan: { configured: !!getApiKey("SHODAN_API_KEY"), name: "Shodan", description: "Internet-connected device & port scanner" },
      hibp: { configured: !!getApiKey("HIBP_API_KEY"), name: "Have I Been Pwned", description: "Data breach monitoring for emails & domains" },
      ssllabs: { configured: true, name: "SSL Labs", description: "SSL/TLS certificate analysis (no key needed)" },
    },
  });
});

router.post("/threat-intel/virustotal/url", async (req, res): Promise<void> => {
  const key = getApiKey("VIRUSTOTAL_API_KEY");
  if (!key) { missingKeyResponse(res, "VirusTotal", "VIRUSTOTAL_API_KEY"); return; }

  const { url } = req.body;
  if (!url) { res.status(400).json({ error: "URL is required" }); return; }

  try {
    const submitRes = await timedFetch("https://www.virustotal.com/api/v3/urls", {
      method: "POST",
      headers: { "x-apikey": key, "Content-Type": "application/x-www-form-urlencoded" },
      body: `url=${encodeURIComponent(url)}`,
    });

    if (!submitRes.ok) {
      const err = await submitRes.text();
      res.status(submitRes.status).json({ error: `VirusTotal API error: ${err}` });
      return;
    }

    const submitData = await submitRes.json() as any;
    const analysisId = submitData.data?.id;

    if (!analysisId) {
      res.status(502).json({ error: "VirusTotal returned no analysis ID" });
      return;
    }

    await new Promise((r) => setTimeout(r, 3000));

    const resultRes = await timedFetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
      headers: { "x-apikey": key },
    });

    if (!resultRes.ok) {
      res.status(resultRes.status).json({ error: "VirusTotal analysis retrieval failed" });
      return;
    }

    const resultData = await resultRes.json() as any;
    const stats = resultData.data?.attributes?.stats || {};
    const results = resultData.data?.attributes?.results || {};

    const detections = Object.entries(results)
      .filter(([_, r]: [string, any]) => r.category === "malicious" || r.category === "suspicious")
      .map(([engine, r]: [string, any]) => ({
        engine,
        category: r.category,
        result: r.result,
      }));

    res.json({
      configured: true,
      url,
      analysisId,
      stats: {
        malicious: stats.malicious || 0,
        suspicious: stats.suspicious || 0,
        harmless: stats.harmless || 0,
        undetected: stats.undetected || 0,
        timeout: stats.timeout || 0,
      },
      totalEngines: Object.keys(results).length,
      detections,
      verdict: stats.malicious > 0 ? "malicious" : stats.suspicious > 0 ? "suspicious" : "clean",
    });
  } catch (err: any) {
    console.error("[threat-intel] VirusTotal URL scan failed:", err.message);
    res.status(500).json({ error: "VirusTotal scan failed" });
  }
});

router.get("/threat-intel/virustotal/domain/:domain", async (req, res): Promise<void> => {
  const key = getApiKey("VIRUSTOTAL_API_KEY");
  if (!key) { missingKeyResponse(res, "VirusTotal", "VIRUSTOTAL_API_KEY"); return; }

  try {
    const r = await timedFetch(`https://www.virustotal.com/api/v3/domains/${req.params.domain}`, {
      headers: { "x-apikey": key },
    });

    if (!r.ok) { res.status(r.status).json({ error: "Domain lookup failed" }); return; }

    const data = await r.json() as any;
    const attrs = data.data?.attributes || {};
    const lastAnalysis = attrs.last_analysis_stats || {};

    res.json({
      configured: true,
      domain: req.params.domain,
      reputation: attrs.reputation || 0,
      categories: attrs.categories || {},
      lastAnalysis: {
        malicious: lastAnalysis.malicious || 0,
        suspicious: lastAnalysis.suspicious || 0,
        harmless: lastAnalysis.harmless || 0,
        undetected: lastAnalysis.undetected || 0,
      },
      whois: attrs.whois || null,
      lastDnsRecords: (attrs.last_dns_records || []).slice(0, 10),
      registrar: attrs.registrar || "Unknown",
      creationDate: attrs.creation_date || null,
    });
  } catch (err: any) {
    console.error("[threat-intel] VirusTotal domain lookup failed:", err.message);
    res.status(500).json({ error: "Domain lookup failed" });
  }
});

router.get("/threat-intel/abuseipdb/check/:ip", async (req, res): Promise<void> => {
  const key = getApiKey("ABUSEIPDB_API_KEY");
  if (!key) { missingKeyResponse(res, "AbuseIPDB", "ABUSEIPDB_API_KEY"); return; }

  try {
    const r = await timedFetch(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(req.params.ip)}&maxAgeInDays=90&verbose`,
      { headers: { Key: key, Accept: "application/json" } }
    );

    if (!r.ok) { res.status(r.status).json({ error: "AbuseIPDB lookup failed" }); return; }

    const data = await r.json() as any;
    const d = data.data || {};

    res.json({
      configured: true,
      ip: d.ipAddress,
      isPublic: d.isPublic,
      abuseConfidenceScore: d.abuseConfidenceScore || 0,
      countryCode: d.countryCode || "Unknown",
      isp: d.isp || "Unknown",
      domain: d.domain || "Unknown",
      usageType: d.usageType || "Unknown",
      totalReports: d.totalReports || 0,
      numDistinctUsers: d.numDistinctUsers || 0,
      lastReportedAt: d.lastReportedAt || null,
      isWhitelisted: d.isWhitelisted || false,
      isTor: d.isTor || false,
      reports: (d.reports || []).slice(0, 10).map((report: any) => ({
        reportedAt: report.reportedAt,
        comment: report.comment,
        categories: report.categories,
        reporterCountryCode: report.reporterCountryCode,
      })),
      verdict: d.abuseConfidenceScore > 75 ? "malicious" : d.abuseConfidenceScore > 25 ? "suspicious" : "clean",
    });
  } catch (err: any) {
    console.error("[threat-intel] AbuseIPDB check failed:", err.message);
    res.status(500).json({ error: "IP reputation check failed" });
  }
});

router.get("/threat-intel/shodan/host/:ip", async (req, res): Promise<void> => {
  const key = getApiKey("SHODAN_API_KEY");
  if (!key) { missingKeyResponse(res, "Shodan", "SHODAN_API_KEY"); return; }

  try {
    const r = await timedFetch(
      `https://api.shodan.io/shodan/host/${encodeURIComponent(req.params.ip)}?key=${key}`
    );

    if (!r.ok) {
      if (r.status === 404) {
        res.json({ configured: true, ip: req.params.ip, found: false, message: "Host not found in Shodan database" });
        return;
      }
      res.status(r.status).json({ error: "Shodan lookup failed" });
      return;
    }

    const data = await r.json() as any;

    res.json({
      configured: true,
      found: true,
      ip: data.ip_str || req.params.ip,
      hostnames: data.hostnames || [],
      os: data.os || "Unknown",
      org: data.org || "Unknown",
      isp: data.isp || "Unknown",
      country: data.country_name || "Unknown",
      city: data.city || "Unknown",
      lastUpdate: data.last_update || null,
      openPorts: (data.ports || []),
      vulns: data.vulns || [],
      services: (data.data || []).slice(0, 20).map((svc: any) => ({
        port: svc.port,
        transport: svc.transport || "tcp",
        product: svc.product || "Unknown",
        version: svc.version || null,
        banner: (svc.data || "").substring(0, 200),
        ssl: svc.ssl ? { cert: { subject: svc.ssl.cert?.subject, issuer: svc.ssl.cert?.issuer, expires: svc.ssl.cert?.expires } } : null,
      })),
      verdict: (data.vulns || []).length > 0 ? "vulnerable" : (data.ports || []).length > 10 ? "suspicious" : "normal",
    });
  } catch (err: any) {
    console.error("[threat-intel] Shodan host lookup failed:", err.message);
    res.status(500).json({ error: "Host lookup failed" });
  }
});

router.get("/threat-intel/shodan/search", async (req, res): Promise<void> => {
  const key = getApiKey("SHODAN_API_KEY");
  if (!key) { missingKeyResponse(res, "Shodan", "SHODAN_API_KEY"); return; }

  const { query } = req.query;
  if (!query) { res.status(400).json({ error: "Search query is required" }); return; }

  try {
    const r = await timedFetch(
      `https://api.shodan.io/shodan/host/search?key=${key}&query=${encodeURIComponent(query as string)}&page=1`
    );

    if (!r.ok) { res.status(r.status).json({ error: "Shodan search failed" }); return; }

    const data = await r.json() as any;

    res.json({
      configured: true,
      total: data.total || 0,
      matches: (data.matches || []).slice(0, 20).map((m: any) => ({
        ip: m.ip_str,
        port: m.port,
        org: m.org,
        os: m.os,
        product: m.product,
        hostnames: m.hostnames,
        location: { country: m.location?.country_name, city: m.location?.city },
      })),
    });
  } catch (err: any) {
    console.error("[threat-intel] Shodan search failed:", err.message);
    res.status(500).json({ error: "Shodan search failed" });
  }
});

router.get("/threat-intel/hibp/breaches/:email", async (req, res): Promise<void> => {
  const key = getApiKey("HIBP_API_KEY");
  if (!key) { missingKeyResponse(res, "Have I Been Pwned", "HIBP_API_KEY"); return; }

  try {
    const r = await timedFetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(req.params.email)}?truncateResponse=false`,
      { headers: { "hibp-api-key": key, "user-agent": "GuardianLayer-Enterprise" } }
    );

    if (r.status === 404) {
      res.json({ configured: true, email: req.params.email, breaches: [], totalBreaches: 0, verdict: "clean" });
      return;
    }

    if (!r.ok) { res.status(r.status).json({ error: "HIBP lookup failed" }); return; }

    const breaches = await r.json() as any[];

    res.json({
      configured: true,
      email: req.params.email,
      totalBreaches: breaches.length,
      breaches: breaches.map((b: any) => ({
        name: b.Name,
        title: b.Title,
        domain: b.Domain,
        breachDate: b.BreachDate,
        addedDate: b.AddedDate,
        pwnCount: b.PwnCount,
        description: b.Description,
        dataClasses: b.DataClasses,
        isVerified: b.IsVerified,
        isSensitive: b.IsSensitive,
        logoPath: b.LogoPath,
      })),
      verdict: breaches.length > 5 ? "critical" : breaches.length > 0 ? "exposed" : "clean",
    });
  } catch (err: any) {
    console.error("[threat-intel] HIBP breach check failed:", err.message);
    res.status(500).json({ error: "Breach check failed" });
  }
});

router.get("/threat-intel/hibp/domain/:domain", async (req, res): Promise<void> => {
  const key = getApiKey("HIBP_API_KEY");
  if (!key) { missingKeyResponse(res, "Have I Been Pwned", "HIBP_API_KEY"); return; }

  try {
    const r = await timedFetch(
      `https://haveibeenpwned.com/api/v3/breaches?domain=${encodeURIComponent(req.params.domain)}`,
      { headers: { "hibp-api-key": key, "user-agent": "GuardianLayer-Enterprise" } }
    );

    if (!r.ok) { res.status(r.status).json({ error: "HIBP domain check failed" }); return; }

    const breaches = await r.json() as any[];

    res.json({
      configured: true,
      domain: req.params.domain,
      totalBreaches: breaches.length,
      breaches: breaches.map((b: any) => ({
        name: b.Name,
        title: b.Title,
        breachDate: b.BreachDate,
        pwnCount: b.PwnCount,
        dataClasses: b.DataClasses,
        isVerified: b.IsVerified,
      })),
    });
  } catch (err: any) {
    console.error("[threat-intel] HIBP domain check failed:", err.message);
    res.status(500).json({ error: "Domain breach check failed" });
  }
});

router.get("/threat-intel/ssllabs/analyze/:host", async (req, res): Promise<void> => {
  const host = req.params.host;
  const fromCache = req.query.fromCache !== "false";

  try {
    const r = await timedFetch(
      `https://api.ssllabs.com/api/v3/analyze?host=${encodeURIComponent(host)}&fromCache=${fromCache ? "on" : "off"}&all=done`
    );

    if (!r.ok) { res.status(r.status).json({ error: "SSL Labs analysis failed" }); return; }

    const data = await r.json() as any;

    res.json({
      configured: true,
      host: data.host,
      port: data.port || 443,
      protocol: data.protocol || "https",
      status: data.status,
      startTime: data.startTime,
      testTime: data.testTime,
      endpoints: (data.endpoints || []).map((ep: any) => ({
        ipAddress: ep.ipAddress,
        grade: ep.grade || "Pending",
        gradeTrustIgnored: ep.gradeTrustIgnored,
        hasWarnings: ep.hasWarnings || false,
        isExceptional: ep.isExceptional || false,
        progress: ep.progress || 0,
        statusMessage: ep.statusMessage || "In progress",
        delegation: ep.delegation,
      })),
      overallGrade: data.endpoints?.[0]?.grade || data.status,
      verdict: data.endpoints?.[0]?.grade === "A+" || data.endpoints?.[0]?.grade === "A"
        ? "secure"
        : data.endpoints?.[0]?.grade === "B"
        ? "acceptable"
        : data.endpoints?.[0]?.grade
        ? "needs-improvement"
        : "pending",
    });
  } catch (err: any) {
    console.error("[threat-intel] SSL Labs analysis failed:", err.message);
    res.status(500).json({ error: "SSL analysis failed" });
  }
});

export default router;
