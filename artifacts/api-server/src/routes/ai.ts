import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, conversations as conversationsTable, messages as messagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { aiLimiter } from "../middleware/rate-limiter";

const router: IRouter = Router();

router.use("/ai", aiLimiter);

const THREAT_ANALYSIS_SYSTEM_PROMPT = `You are GuardianLayer AI — a senior cybersecurity analyst specializing in threat intelligence, incident response, and digital forensics. When analyzing a threat or security alert, provide a comprehensive analysis covering:

1. **What is this threat?** — Clear explanation in plain language of what happened, what type of attack/breach this is
2. **Threat Category** — Classify it (phishing, data breach, credential stuffing, malware, ransomware, social engineering, identity theft, financial fraud, etc.)
3. **Severity Assessment** — Rate Critical/High/Medium/Low with justification
4. **Known Threat Intelligence** — What's known about this type of attack from public threat intelligence sources, recent trends, and similar incidents reported online
5. **Who might be behind this?** — Attribution analysis: known threat actor groups, common perpetrators for this attack type, geographic indicators
6. **Potential Consequences** — What could happen if not addressed: financial loss, data exposure, regulatory penalties, reputational damage
7. **Exact Remediation Steps** — Numbered, specific, actionable steps to neutralize the threat RIGHT NOW. Include commands, settings changes, contacts to make
8. **Asset/Data Recovery Plan** — How to recover any compromised data or assets, step by step
9. **Prevention** — How to prevent this from happening again

Be specific, actionable, and urgent. Do not use vague language. Give exact steps, tool names, commands, and contacts where applicable. If you reference something happening on the internet, cite the type of source (security blogs, CVE databases, threat feeds, etc.).`;

router.post("/ai/conversations", async (_req, res): Promise<void> => {
  try {
    const { title, context } = _req.body || {};
    const [conversation] = await db
      .insert(conversationsTable)
      .values({ title: title || "Threat Analysis" })
      .returning();

    if (context) {
      await db.insert(messagesTable).values({
        conversationId: conversation.id,
        role: "system",
        content: context,
      });
    }

    res.json(conversation);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ai] POST /conversations failed:", message);
    res.status(500).json({ error: "Failed to create conversation." });
  }
});

router.get("/ai/conversations", async (_req, res): Promise<void> => {
  try {
    const conversations = await db
      .select()
      .from(conversationsTable)
      .orderBy(desc(conversationsTable.createdAt))
      .limit(50);
    res.json(conversations);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ai] GET /conversations failed:", message);
    res.status(500).json({ error: "Failed to list conversations." });
  }
});

router.get("/ai/conversations/:id/messages", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const msgs = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(messagesTable.createdAt);
    res.json(msgs);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ai] GET /conversations/:id/messages failed:", message);
    res.status(500).json({ error: "Failed to get messages." });
  }
});

router.post("/ai/analyze-threat", async (req, res): Promise<void> => {
  try {
    const { threatDescription, conversationId } = req.body;
    if (!threatDescription) {
      res.status(400).json({ error: "threatDescription is required" });
      return;
    }

    let convId = conversationId;
    if (!convId) {
      const [conv] = await db
        .insert(conversationsTable)
        .values({ title: `Threat Analysis: ${threatDescription.substring(0, 50)}...` })
        .returning();
      convId = conv.id;
    }

    await db.insert(messagesTable).values({
      conversationId: convId,
      role: "user",
      content: `Analyze this security threat:\n\n${threatDescription}`,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.write(`data: ${JSON.stringify({ conversationId: convId })}\n\n`);

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: THREAT_ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: `Analyze this security threat:\n\n${threatDescription}` },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messagesTable).values({
      conversationId: convId,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true, conversationId: convId })}\n\n`);
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ai] POST /analyze-threat failed:", message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to analyze threat." });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }
});

router.post("/ai/conversations/:id/messages", async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { content: userMessage } = req.body;
    if (!userMessage) {
      res.status(400).json({ error: "content is required" });
      return;
    }

    await db.insert(messagesTable).values({
      conversationId: id,
      role: "user",
      content: userMessage,
    });

    const existingMessages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(messagesTable.createdAt);

    const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: THREAT_ANALYSIS_SYSTEM_PROMPT },
      ...existingMessages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      })),
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messagesTable).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ai] POST /conversations/:id/messages failed:", message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to send message." });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }
});

const THREAT_EVALUATION_SYSTEM_PROMPT = `You are GuardianLayer AI — a senior cybersecurity analyst and incident response commander. You are evaluating a specific security threat detected by the platform. Your job is to provide THREE things:

## SECTION 1: THREAT EVALUATION
Provide a clear, structured analysis:
- **Threat Type**: Classify exactly (e.g., Spear Phishing + SQL Injection APT Campaign, Credential Stuffing, Ransomware Delivery, Data Exfiltration via C2 Channel, etc.)
- **Severity**: Critical / High / Medium / Low with 1-sentence justification
- **Confidence Assessment**: How confident you are this is a real threat vs. false positive
- **Attack Vector**: How the attack works step by step in plain language
- **Threat Actor Profile**: What type of attacker this likely is (script kiddie, organized crime, nation-state APT, insider threat, etc.)
- **Indicators of Compromise (IOCs)**: List specific IPs, domains, hashes, email addresses, ports, or patterns to watch for

## SECTION 2: ELIMINATION PLAN
Provide exact, numbered steps to eliminate this threat RIGHT NOW:
1. **Immediate Actions** (do within 5 minutes): Specific commands, settings changes, blocks to apply
2. **Short-term Containment** (do within 1 hour): Isolation steps, credential resets, rule updates
3. **Eradication** (do within 24 hours): Remove all traces, patch vulnerabilities, update signatures
4. **Recovery** (do within 48 hours): Restore normal operations, verify clean state
5. **Post-Incident** (do within 1 week): Lessons learned, policy updates, training

For each step, provide exact tool names, commands, or specific actions — not vague advice.

## SECTION 3: GOVERNMENT AGENCY REPORTING GUIDE
Based on the threat type, tell the user EXACTLY which agencies to report to, with:
- **FBI Internet Crime Complaint Center (IC3)**: Report at ic3.gov — for cybercrimes, fraud, identity theft, ransomware. Include: incident date, financial loss amount, IP addresses, email addresses used
- **CISA (Cybersecurity & Infrastructure Security Agency)**: Report at cisa.gov/report — for critical infrastructure attacks, advanced persistent threats, nation-state activity. Use their 24/7 hotline: 1-888-282-0870
- **FTC (Federal Trade Commission)**: Report at reportfraud.ftc.gov — for consumer fraud, identity theft, deceptive practices
- **US-CERT**: Report at us-cert.cisa.gov — for zero-day exploits, malware samples, vulnerability disclosures
- **SEC (Securities and Exchange Commission)**: Required for publicly traded companies experiencing material cybersecurity incidents (8-K filing within 4 business days per SEC cyber rules)
- **State Attorney General**: Required by most US states within 30-72 hours if personal data of residents was exposed
- **Local FBI Field Office**: For active, ongoing attacks — provide the nearest field office lookup at fbi.gov/contact-us/field-offices
- **International**: INTERPOL (interpol.int) for cross-border cybercrime, Europol (europol.europa.eu) for EU-based attacks

For each agency, specify:
1. Whether reporting is REQUIRED or RECOMMENDED for this specific threat
2. What information to include in the report
3. Expected response timeline
4. Any legal deadlines (e.g., 72-hour GDPR notification, 4-day SEC 8-K filing)

Be specific to the threat described. Don't list every agency — only the ones relevant to THIS specific incident.`;

router.post("/ai/evaluate-threat", async (req, res): Promise<void> => {
  try {
    const { threatTitle, threatDetail, severity, sources, confidence, timeline } = req.body;
    if (!threatDetail) {
      res.status(400).json({ error: "threatDetail is required" });
      return;
    }

    const threatContext = [
      `THREAT: ${threatTitle || "Security Incident"}`,
      `SEVERITY: ${severity || "unknown"}`,
      `CONFIDENCE: ${confidence ? confidence + "%" : "unknown"}`,
      `DETECTION SOURCES: ${(sources || []).join(", ") || "unknown"}`,
      `DETAILS: ${threatDetail}`,
      timeline ? `TIMELINE:\n${timeline.map((t: any) => `  - ${t.time}: ${t.title} — ${t.description} [${t.status}]`).join("\n")}` : "",
    ].filter(Boolean).join("\n");

    const [conv] = await db
      .insert(conversationsTable)
      .values({ title: `Threat Evaluation: ${(threatTitle || threatDetail).substring(0, 60)}` })
      .returning();

    await db.insert(messagesTable).values({
      conversationId: conv.id,
      role: "user",
      content: `Evaluate this security threat and provide: (1) full threat analysis, (2) step-by-step elimination plan, and (3) which government agencies to report this to:\n\n${threatContext}`,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.write(`data: ${JSON.stringify({ conversationId: conv.id })}\n\n`);

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: THREAT_EVALUATION_SYSTEM_PROMPT },
        { role: "user", content: `Evaluate this security threat and provide: (1) full threat analysis, (2) step-by-step elimination plan, and (3) which government agencies to report this to:\n\n${threatContext}` },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messagesTable).values({
      conversationId: conv.id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true, conversationId: conv.id })}\n\n`);
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[ai] POST /evaluate-threat failed:", message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to evaluate threat." });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }
});

export default router;
