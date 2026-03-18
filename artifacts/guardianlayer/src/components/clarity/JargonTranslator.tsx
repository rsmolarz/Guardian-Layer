import { useState, useRef, useEffect, ReactNode, useCallback } from "react";
import { createPortal } from "react-dom";
import { BookOpen } from "lucide-react";

const JARGON_DICTIONARY: Record<string, string> = {
  "IDS": "Intrusion Detection System — software that watches your network for suspicious activity, like a security camera for your internet traffic.",
  "IPS": "Intrusion Prevention System — like IDS but it also blocks threats automatically, not just detects them.",
  "DDoS": "Distributed Denial of Service — when attackers flood your website or server with so much traffic that it can't serve real users, like a crowd blocking a store entrance.",
  "APT": "Advanced Persistent Threat — a sophisticated, long-term hacking campaign where attackers quietly stay in your systems to steal data over time.",
  "C2": "Command and Control — a communication channel that hackers use to remotely control malware they've placed on your systems.",
  "SQL injection": "A hacking technique where attackers insert malicious code into your website's database queries to steal or modify data.",
  "SYN flood": "A type of attack that overwhelms your server by sending thousands of fake connection requests, like prank-calling a phone line non-stop.",
  "phishing": "Fake emails or messages designed to trick people into revealing passwords, credit card numbers, or other sensitive information.",
  "malware": "Malicious software — any program designed to harm your computer, steal data, or disrupt operations, including viruses and ransomware.",
  "ransomware": "Malware that locks your files and demands payment to unlock them — like a digital kidnapper holding your data hostage.",
  "brute force": "An attack method that tries every possible password combination until one works — like trying every key on a keyring.",
  "zero-day": "A newly discovered software vulnerability that hackers can exploit before the software maker has a chance to fix it.",
  "EDR": "Endpoint Detection and Response — security software on individual computers that monitors for and responds to threats.",
  "SIEM": "Security Information and Event Management — a system that collects and analyzes security data from across your entire organization.",
  "MFA": "Multi-Factor Authentication — requiring two or more forms of identity verification (like a password plus a phone code) to log in.",
  "2FA": "Two-Factor Authentication — a specific type of MFA that uses exactly two verification steps.",
  "VPN": "Virtual Private Network — creates an encrypted tunnel for your internet traffic, keeping your online activity private and secure.",
  "firewall": "A security barrier between your network and the internet that blocks unauthorized access — like a bouncer at a club entrance.",
  "endpoint": "Any device that connects to your network — computers, phones, tablets, servers, etc.",
  "vulnerability": "A weakness in software or systems that attackers could exploit to gain unauthorized access.",
  "patch": "A software update that fixes security vulnerabilities or bugs.",
  "encryption": "Scrambling data so only authorized people with the right key can read it.",
  "SPF": "Sender Policy Framework — an email security standard that helps prevent email spoofing by verifying the sender's identity.",
  "DKIM": "DomainKeys Identified Mail — adds a digital signature to emails to prove they haven't been tampered with.",
  "DMARC": "Domain-based Message Authentication — an email policy that tells receiving servers what to do with emails that fail SPF or DKIM checks.",
  "spoofing": "Faking the sender address of an email or the source of network traffic to impersonate a trusted source.",
  "BEC": "Business Email Compromise — a scam where attackers impersonate executives or trusted partners via email to trick employees into transferring money or data.",
  "CVE": "Common Vulnerabilities and Exposures — a standardized naming system for publicly known security vulnerabilities.",
  "GDPR": "General Data Protection Regulation — European privacy law that requires organizations to protect personal data.",
  "SOC": "Security Operations Center — a team of security professionals who monitor and respond to threats around the clock.",
  "telemetry": "Data collected from your systems about their performance and security status.",
  "exfiltration": "The unauthorized transfer of data out of your organization — essentially data theft.",
  "port scan": "When someone probes your network to find open entry points — like checking every window and door of a building.",
  "quarantine": "Isolating a suspicious file or email so it can't cause harm while it's being investigated.",
  "IoC": "Indicator of Compromise — evidence that a security breach has occurred, like suspicious files or unusual network traffic.",
  "sandbox": "An isolated environment where suspicious files are safely tested to see if they're dangerous.",
  "DNS": "Domain Name System — the internet's phone book that translates website names into the numerical addresses computers use.",
  "SSL/TLS": "Protocols that encrypt the connection between your browser and websites — shown by the padlock icon in your browser.",
  "WAF": "Web Application Firewall — a filter that sits in front of your website to block common web attacks.",
  "risk score": "A numerical rating of how dangerous a threat or transaction is, usually from 0 (safe) to 1 (very dangerous).",
  "compliance": "Meeting the security standards and regulations required by law or industry standards.",
  "remediation": "The process of fixing a security issue or vulnerability.",
  "anomaly": "Unusual behavior that could indicate a security threat — like an employee accessing files at 3 AM from another country.",
  "YubiKey": "A physical security key (small USB device) used for strong authentication — much harder to hack than passwords alone.",
  "credential": "Login information, typically a username and password combination.",
  "dark web": "Hidden parts of the internet where stolen data, hacking tools, and illegal services are often bought and sold.",
  "SIM swap": "A scam where attackers convince your phone carrier to transfer your phone number to their device, letting them intercept your calls and texts.",
};

const JARGON_TERMS_SORTED = Object.keys(JARGON_DICTIONARY).sort((a, b) => b.length - a.length);
const JARGON_PATTERN = new RegExp(`\\b(${JARGON_TERMS_SORTED.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "INPUT", "TEXTAREA", "SELECT", "BUTTON", "SVG", "CODE", "PRE"]);
const SKIP_ATTRS = ["data-jargon-processed", "data-jargon-tooltip"];

function findTermKey(matched: string): string | undefined {
  return Object.keys(JARGON_DICTIONARY).find(k => k.toLowerCase() === matched.toLowerCase());
}

export function JargonTooltip({ term, children }: { term: string; children: ReactNode }) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState<"above" | "below">("below");
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (show && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.top < 200) setPosition("below");
      else setPosition("above");
    }
  }, [show]);

  const definition = JARGON_DICTIONARY[term] || JARGON_DICTIONARY[term.toLowerCase()];
  if (!definition) return <>{children}</>;

  return (
    <span
      ref={ref}
      className="relative inline-flex items-center gap-1 cursor-help border-b border-dotted border-primary/40 hover:border-primary transition-colors"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <BookOpen className="w-3 h-3 text-primary/50" />
      {show && (
        <span
          className={`absolute z-[100] left-0 w-72 p-3 rounded-lg bg-card border border-primary/20 shadow-[0_0_20px_rgba(6,182,212,0.15)] text-xs text-muted-foreground leading-relaxed ${
            position === "above" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <span className="font-display text-primary text-[10px] uppercase tracking-widest block mb-1">{term}</span>
          {definition}
        </span>
      )}
    </span>
  );
}

export function AutoJargon({ text }: { text: string }) {
  const terms = JARGON_TERMS_SORTED;
  const pattern = new RegExp(`\\b(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
  const parts: Array<{ type: 'text' | 'term'; value: string; key: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const matchedTerm = match[1];
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index), key: `t${lastIndex}` });
    }
    parts.push({ type: 'term', value: matchedTerm, key: `j${match.index}` });
    lastIndex = match.index + matchedTerm.length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex), key: `t${lastIndex}` });
  }

  if (parts.length === 0) return <>{text}</>;

  return (
    <>
      {parts.map(part =>
        part.type === 'term' ? (
          <JargonTooltip key={part.key} term={part.value}>{part.value}</JargonTooltip>
        ) : (
          <span key={part.key}>{part.value}</span>
        )
      )}
    </>
  );
}

function DomJargonTooltip({ term, rect }: { term: string; rect: DOMRect }) {
  const [show, setShow] = useState(false);
  const definition = JARGON_DICTIONARY[term] || JARGON_DICTIONARY[term.toLowerCase()];
  if (!definition) return null;

  const position = rect.top < 200 ? "below" : "above";

  return createPortal(
    <span
      style={{
        position: "fixed",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        pointerEvents: "auto",
        zIndex: 99,
      }}
      className="cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {show && (
        <span
          className={`absolute z-[100] left-0 w-72 p-3 rounded-lg bg-card border border-primary/20 shadow-[0_0_20px_rgba(6,182,212,0.15)] text-xs text-muted-foreground leading-relaxed ${
            position === "above" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
          style={{ pointerEvents: "auto" }}
        >
          <span className="font-display text-primary text-[10px] uppercase tracking-widest block mb-1">{term}</span>
          {definition}
        </span>
      )}
    </span>,
    document.body
  );
}

function shouldSkipNode(node: Node): boolean {
  let current: Node | null = node;
  while (current) {
    if (current instanceof HTMLElement) {
      if (SKIP_TAGS.has(current.tagName)) return true;
      if (SKIP_ATTRS.some(attr => current instanceof HTMLElement && current.hasAttribute(attr))) return true;
      if (current.classList.contains("jargon-tooltip-wrapper")) return true;
    }
    current = current.parentNode;
  }
  return false;
}

function processTextNode(textNode: Text): void {
  const text = textNode.textContent;
  if (!text || text.trim().length < 2) return;
  if (shouldSkipNode(textNode)) return;

  JARGON_PATTERN.lastIndex = 0;
  const matches: Array<{ index: number; length: number; term: string; termKey: string }> = [];

  let match: RegExpExecArray | null;
  while ((match = JARGON_PATTERN.exec(text)) !== null) {
    const matchedTerm = match[1];
    const termKey = findTermKey(matchedTerm) || matchedTerm;
    matches.push({ index: match.index, length: matchedTerm.length, term: matchedTerm, termKey });
  }

  if (matches.length === 0) return;

  const fragment = document.createDocumentFragment();
  let lastIdx = 0;

  for (const m of matches) {
    if (m.index > lastIdx) {
      fragment.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));
    }

    const wrapper = document.createElement("span");
    wrapper.className = "jargon-tooltip-wrapper inline-flex items-center gap-0.5 cursor-help border-b border-dotted border-primary/40 hover:border-primary transition-colors";
    wrapper.setAttribute("data-jargon-tooltip", m.termKey);
    wrapper.setAttribute("data-jargon-processed", "true");
    wrapper.textContent = m.term;

    const icon = document.createElement("span");
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary/50"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`;
    icon.className = "inline-flex";
    wrapper.appendChild(icon);

    fragment.appendChild(wrapper);
    lastIdx = m.index + m.length;
  }

  if (lastIdx < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
  }

  textNode.parentNode?.replaceChild(fragment, textNode);
}

function scanForJargon(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent || node.textContent.trim().length < 2) return NodeFilter.FILTER_REJECT;
      if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const textNodes: Text[] = [];
  let currentNode: Text | null;
  while ((currentNode = walker.nextNode() as Text | null)) {
    textNodes.push(currentNode);
  }

  for (const tn of textNodes) {
    processTextNode(tn);
  }
}

function addTooltipListeners(root: HTMLElement): (() => void) {
  let activeTooltip: HTMLElement | null = null;

  const showTooltip = (wrapper: HTMLElement) => {
    hideTooltip();
    const termKey = wrapper.getAttribute("data-jargon-tooltip");
    if (!termKey) return;
    const definition = JARGON_DICTIONARY[termKey] || JARGON_DICTIONARY[termKey.toLowerCase()];
    if (!definition) return;

    const rect = wrapper.getBoundingClientRect();
    const position = rect.top < 200 ? "below" : "above";

    const tooltip = document.createElement("div");
    tooltip.className = `fixed z-[100] w-72 p-3 rounded-lg border text-xs leading-relaxed`;
    tooltip.style.cssText = `
      left: ${rect.left}px;
      ${position === "above" ? `bottom: ${window.innerHeight - rect.top + 8}px` : `top: ${rect.bottom + 8}px`};
      background: hsl(var(--card));
      border-color: rgba(6, 182, 212, 0.2);
      box-shadow: 0 0 20px rgba(6, 182, 212, 0.15);
      color: hsl(var(--muted-foreground));
      pointer-events: none;
    `;
    tooltip.innerHTML = `<span style="font-family: var(--font-display); color: hsl(var(--primary)); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 4px;">${termKey}</span>${definition}`;

    document.body.appendChild(tooltip);
    activeTooltip = tooltip;
  };

  const hideTooltip = () => {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
  };

  const handleMouseOver = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest("[data-jargon-tooltip]");
    if (target instanceof HTMLElement) {
      showTooltip(target);
    }
  };

  const handleMouseOut = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest("[data-jargon-tooltip]");
    if (target) {
      hideTooltip();
    }
  };

  root.addEventListener("mouseover", handleMouseOver);
  root.addEventListener("mouseout", handleMouseOut);

  return () => {
    root.removeEventListener("mouseover", handleMouseOver);
    root.removeEventListener("mouseout", handleMouseOut);
    hideTooltip();
  };
}

export function GlobalJargonProvider({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const runScan = useCallback(() => {
    if (!containerRef.current) return;

    if (cleanupRef.current) {
      cleanupRef.current();
    }

    scanForJargon(containerRef.current);
    cleanupRef.current = addTooltipListeners(containerRef.current);
  }, []);

  useEffect(() => {
    const timer = setTimeout(runScan, 500);

    const observer = new MutationObserver((mutations) => {
      let hasNewContent = false;
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement && !node.hasAttribute("data-jargon-processed") && !node.classList.contains("jargon-tooltip-wrapper")) {
              hasNewContent = true;
              break;
            }
            if (node instanceof Text && node.textContent && node.textContent.trim().length > 2) {
              hasNewContent = true;
              break;
            }
          }
        }
        if (hasNewContent) break;
      }

      if (hasNewContent) {
        setTimeout(runScan, 300);
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [runScan]);

  return <div ref={containerRef} data-jargon-scope="global">{children}</div>;
}

export function useJargonDictionary() {
  return JARGON_DICTIONARY;
}

export { JARGON_DICTIONARY };
