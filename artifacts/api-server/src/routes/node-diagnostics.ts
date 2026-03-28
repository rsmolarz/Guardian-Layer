import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { remoteMachinesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "../lib/activity-logger";
import { requireSuperadmin } from "../middleware/auth";
import crypto from "crypto";
import { Client } from "ssh2";

const router: IRouter = Router();

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const raw = process.env.DATABASE_URL || "gl-remote-fallback-key";
  return crypto.createHash("sha256").update(raw).digest();
}

function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted data format");
  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function sshExec(machine: { hostname: string; port: number; username: string; authMethod: string; credential: string }, command: string, timeoutMs = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const timer = setTimeout(() => {
      conn.end();
      reject(new Error("SSH command timed out"));
    }, timeoutMs);

    conn.on("ready", () => {
      conn.exec(command, (err, stream) => {
        if (err) { clearTimeout(timer); conn.end(); reject(err); return; }
        let output = "";
        let stderr = "";
        stream.on("data", (data: Buffer) => { output += data.toString(); });
        stream.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });
        stream.on("close", () => {
          clearTimeout(timer);
          conn.end();
          resolve(output + (stderr ? "\n[STDERR] " + stderr : ""));
        });
      });
    });

    conn.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    const connectConfig: any = {
      host: machine.hostname,
      port: machine.port,
      username: machine.username,
      readyTimeout: 10000,
    };

    if (machine.authMethod === "key") {
      connectConfig.privateKey = machine.credential;
    } else {
      connectConfig.password = machine.credential;
    }

    conn.connect(connectConfig);
  });
}

interface DiagnosticCheck {
  id: string;
  label: string;
  category: string;
  command: string;
  parser: (raw: string) => DiagnosticResult;
}

interface DiagnosticResult {
  status: "healthy" | "warning" | "critical";
  value: string;
  detail: string;
  metric?: number;
}

function parseCpuUsage(raw: string): DiagnosticResult {
  const lines = raw.trim().split("\n");
  const idleMatch = raw.match(/(\d+\.?\d*)\s*id/);
  if (idleMatch) {
    const idle = parseFloat(idleMatch[1]);
    const usage = 100 - idle;
    return {
      status: usage > 90 ? "critical" : usage > 70 ? "warning" : "healthy",
      value: `${usage.toFixed(1)}%`,
      detail: lines.slice(0, 3).join("\n"),
      metric: usage,
    };
  }
  const loadMatch = raw.match(/load average[s]?:\s*([\d.]+)/);
  if (loadMatch) {
    const load = parseFloat(loadMatch[1]);
    return {
      status: load > 4 ? "critical" : load > 2 ? "warning" : "healthy",
      value: `Load: ${load.toFixed(2)}`,
      detail: raw.trim(),
      metric: load,
    };
  }
  return { status: "healthy", value: "N/A", detail: raw.trim() };
}

function parseMemory(raw: string): DiagnosticResult {
  const match = raw.match(/Mem:\s+(\S+)\s+(\S+)\s+(\S+)/);
  if (match) {
    const total = match[1];
    const used = match[2];
    const totalNum = parseFloat(total);
    const usedNum = parseFloat(used);
    const pct = totalNum > 0 ? (usedNum / totalNum) * 100 : 0;
    return {
      status: pct > 90 ? "critical" : pct > 75 ? "warning" : "healthy",
      value: `${pct.toFixed(1)}% (${used}/${total})`,
      detail: raw.trim(),
      metric: pct,
    };
  }
  const pctMatch = raw.match(/([\d.]+)%/);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    return {
      status: pct > 90 ? "critical" : pct > 75 ? "warning" : "healthy",
      value: `${pct.toFixed(1)}%`,
      detail: raw.trim(),
      metric: pct,
    };
  }
  return { status: "healthy", value: "N/A", detail: raw.trim() };
}

function parseDisk(raw: string): DiagnosticResult {
  const lines = raw.trim().split("\n");
  let worstPct = 0;
  let worstLine = "";
  for (const line of lines) {
    const match = line.match(/(\d+)%/);
    if (match) {
      const pct = parseInt(match[1]);
      if (pct > worstPct) {
        worstPct = pct;
        worstLine = line.trim();
      }
    }
  }
  return {
    status: worstPct > 95 ? "critical" : worstPct > 80 ? "warning" : "healthy",
    value: `${worstPct}% used`,
    detail: lines.slice(0, 6).join("\n"),
    metric: worstPct,
  };
}

function parseSwap(raw: string): DiagnosticResult {
  const match = raw.match(/Swap:\s+(\S+)\s+(\S+)/);
  if (match) {
    const total = parseFloat(match[1]);
    const used = parseFloat(match[2]);
    if (total === 0) return { status: "healthy", value: "No swap", detail: raw.trim(), metric: 0 };
    const pct = (used / total) * 100;
    return {
      status: pct > 80 ? "critical" : pct > 50 ? "warning" : "healthy",
      value: `${pct.toFixed(1)}% (${match[2]}/${match[1]})`,
      detail: raw.trim(),
      metric: pct,
    };
  }
  return { status: "healthy", value: "N/A", detail: raw.trim() };
}

function parseUptime(raw: string): DiagnosticResult {
  const dayMatch = raw.match(/up\s+(\d+)\s+day/);
  const days = dayMatch ? parseInt(dayMatch[1]) : 0;
  return {
    status: days > 90 ? "warning" : "healthy",
    value: days > 0 ? `${days} days` : raw.trim().substring(0, 60),
    detail: raw.trim(),
    metric: days,
  };
}

function parseTopProcesses(raw: string): DiagnosticResult {
  const lines = raw.trim().split("\n").filter(l => l.trim());
  const highCpu = lines.filter(l => {
    const parts = l.trim().split(/\s+/);
    const cpu = parseFloat(parts[0]);
    return cpu > 50;
  });
  return {
    status: highCpu.length > 2 ? "critical" : highCpu.length > 0 ? "warning" : "healthy",
    value: `${highCpu.length} high-CPU processes`,
    detail: lines.slice(0, 10).join("\n"),
    metric: highCpu.length,
  };
}

function parseIOWait(raw: string): DiagnosticResult {
  const match = raw.match(/([\d.]+)\s*wa/);
  if (match) {
    const iowait = parseFloat(match[1]);
    return {
      status: iowait > 30 ? "critical" : iowait > 10 ? "warning" : "healthy",
      value: `${iowait.toFixed(1)}%`,
      detail: raw.trim(),
      metric: iowait,
    };
  }
  return { status: "healthy", value: "N/A", detail: raw.trim() };
}

function parseOpenFiles(raw: string): DiagnosticResult {
  const count = parseInt(raw.trim()) || 0;
  return {
    status: count > 50000 ? "critical" : count > 20000 ? "warning" : "healthy",
    value: `${count.toLocaleString()} open`,
    detail: `Total open file descriptors: ${count}`,
    metric: count,
  };
}

function parseZombies(raw: string): DiagnosticResult {
  const count = parseInt(raw.trim()) || 0;
  return {
    status: count > 10 ? "critical" : count > 0 ? "warning" : "healthy",
    value: count === 0 ? "None" : `${count} zombie(s)`,
    detail: count === 0 ? "No zombie processes detected" : `${count} zombie processes found`,
    metric: count,
  };
}

function parseNetworkConnections(raw: string): DiagnosticResult {
  const count = parseInt(raw.trim()) || 0;
  return {
    status: count > 1000 ? "critical" : count > 500 ? "warning" : "healthy",
    value: `${count} connections`,
    detail: `Active network connections: ${count}`,
    metric: count,
  };
}

function parseDnsResolution(raw: string): DiagnosticResult {
  const timeMatch = raw.match(/time:\s*(\d+)/i) || raw.match(/(\d+)\s*msec/i);
  if (timeMatch) {
    const ms = parseInt(timeMatch[1]);
    return {
      status: ms > 1000 ? "critical" : ms > 200 ? "warning" : "healthy",
      value: `${ms}ms`,
      detail: raw.trim().substring(0, 200),
      metric: ms,
    };
  }
  if (raw.toLowerCase().includes("timed out") || raw.toLowerCase().includes("error") || raw.toLowerCase().includes("servfail")) {
    return { status: "critical", value: "Failed", detail: raw.trim().substring(0, 200) };
  }
  return { status: "healthy", value: "OK", detail: raw.trim().substring(0, 200) };
}

function parseGeneric(raw: string): DiagnosticResult {
  return { status: "healthy", value: "Complete", detail: raw.trim().substring(0, 500) };
}

const DIAGNOSTIC_CHECKS: DiagnosticCheck[] = [
  {
    id: "cpu_usage",
    label: "CPU Usage",
    category: "Compute",
    command: "top -bn1 | head -5 2>/dev/null || uptime",
    parser: parseCpuUsage,
  },
  {
    id: "memory_usage",
    label: "Memory Usage",
    category: "Compute",
    command: "free -h 2>/dev/null || vm_stat 2>/dev/null || echo 'N/A'",
    parser: parseMemory,
  },
  {
    id: "swap_usage",
    label: "Swap Usage",
    category: "Compute",
    command: "free -h | grep -i swap 2>/dev/null || sysctl vm.swapusage 2>/dev/null || echo 'Swap: 0 0'",
    parser: parseSwap,
  },
  {
    id: "disk_usage",
    label: "Disk Usage",
    category: "Storage",
    command: "df -h --type=ext4 --type=xfs --type=btrfs --type=apfs 2>/dev/null || df -h / /home 2>/dev/null || df -h /",
    parser: parseDisk,
  },
  {
    id: "io_wait",
    label: "I/O Wait",
    category: "Storage",
    command: "top -bn1 | head -5 | grep -i cpu 2>/dev/null || iostat 2>/dev/null || echo '0.0 wa'",
    parser: parseIOWait,
  },
  {
    id: "uptime",
    label: "System Uptime",
    category: "System",
    command: "uptime",
    parser: parseUptime,
  },
  {
    id: "top_processes",
    label: "Top Processes (CPU)",
    category: "Processes",
    command: "ps aux --sort=-%cpu 2>/dev/null | awk 'NR>1{print $3, $4, $11}' | head -10 || ps aux | sort -nrk 3 | head -10 | awk '{print $3, $4, $11}'",
    parser: parseTopProcesses,
  },
  {
    id: "zombie_processes",
    label: "Zombie Processes",
    category: "Processes",
    command: "ps aux | awk '$8 ~ /Z/ {count++} END {print count+0}'",
    parser: parseZombies,
  },
  {
    id: "open_files",
    label: "Open File Descriptors",
    category: "Processes",
    command: "cat /proc/sys/fs/file-nr 2>/dev/null | awk '{print $1}' || lsof 2>/dev/null | wc -l || echo '0'",
    parser: parseOpenFiles,
  },
  {
    id: "network_connections",
    label: "Network Connections",
    category: "Network",
    command: "ss -s 2>/dev/null | grep 'TCP:' | awk '{print $2}' || netstat -an 2>/dev/null | wc -l || echo '0'",
    parser: parseNetworkConnections,
  },
  {
    id: "dns_resolution",
    label: "DNS Resolution",
    category: "Network",
    command: "dig google.com +short +time=3 +tries=1 2>/dev/null && echo 'time: 0' || nslookup google.com 2>&1 | tail -3",
    parser: parseDnsResolution,
  },
  {
    id: "system_info",
    label: "System Info",
    category: "System",
    command: "echo '=== OS ===' && (cat /etc/os-release 2>/dev/null | head -3 || sw_vers 2>/dev/null || ver 2>/dev/null) && echo '=== Kernel ===' && uname -r && echo '=== CPU ===' && (nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 'N/A') && echo ' cores'",
    parser: parseGeneric,
  },
];

interface OptimizationAction {
  id: string;
  label: string;
  description: string;
  category: string;
  risk: "low" | "medium" | "high";
  command: string;
}

const OPTIMIZATION_ACTIONS: OptimizationAction[] = [
  {
    id: "clear_caches",
    label: "Clear System Caches",
    description: "Drop filesystem caches to free memory (safe, kernel will rebuild as needed)",
    category: "Memory",
    risk: "low",
    command: "sync && echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null 2>&1 && echo 'Caches cleared successfully' || echo 'Failed: need sudo privileges'",
  },
  {
    id: "clear_tmp",
    label: "Clear Temp Files",
    description: "Remove temporary files older than 7 days from /tmp and /var/tmp",
    category: "Disk",
    risk: "low",
    command: "sudo find /tmp -type f -atime +7 -delete 2>/dev/null; sudo find /var/tmp -type f -atime +7 -delete 2>/dev/null; echo 'Old temp files cleared'",
  },
  {
    id: "clear_journal",
    label: "Trim System Logs",
    description: "Remove system journal logs older than 3 days",
    category: "Disk",
    risk: "low",
    command: "sudo journalctl --vacuum-time=3d 2>/dev/null && echo 'Journal trimmed' || echo 'journalctl not available'",
  },
  {
    id: "clear_apt_cache",
    label: "Clear Package Cache",
    description: "Remove cached package downloads (apt/yum)",
    category: "Disk",
    risk: "low",
    command: "sudo apt-get clean 2>/dev/null && echo 'APT cache cleared' || sudo yum clean all 2>/dev/null && echo 'YUM cache cleared' || echo 'No package manager cache found'",
  },
  {
    id: "kill_zombies",
    label: "Kill Zombie Processes",
    description: "Attempt to clean up zombie processes by signaling their parents",
    category: "Processes",
    risk: "medium",
    command: "ps -eo ppid= -o stat= | awk '$2 ~ /Z/ {print $1}' | sort -u | xargs -r kill -s SIGCHLD 2>/dev/null; echo 'Sent SIGCHLD to zombie parents'; sleep 1; echo \"Remaining zombies: $(ps aux | awk '$8 ~ /Z/' | wc -l)\"",
  },
  {
    id: "restart_failed_services",
    label: "Restart Failed Services",
    description: "Detect and restart any failed systemd services",
    category: "Services",
    risk: "medium",
    command: "FAILED=$(systemctl list-units --state=failed --no-legend 2>/dev/null | awk '{print $1}'); if [ -z \"$FAILED\" ]; then echo 'No failed services'; else echo \"Failed: $FAILED\"; for svc in $FAILED; do echo \"Restarting $svc...\"; sudo systemctl restart \"$svc\" 2>/dev/null; done; echo 'Restart attempts complete'; fi",
  },
  {
    id: "flush_dns",
    label: "Flush DNS Cache",
    description: "Clear the system DNS resolver cache",
    category: "Network",
    risk: "low",
    command: "sudo systemd-resolve --flush-caches 2>/dev/null && echo 'DNS cache flushed' || sudo resolvectl flush-caches 2>/dev/null && echo 'DNS flushed' || echo 'DNS flush command not found'",
  },
  {
    id: "sync_time",
    label: "Sync System Clock",
    description: "Force NTP time synchronization",
    category: "System",
    risk: "low",
    command: "sudo timedatectl set-ntp true 2>/dev/null; sudo chronyc makestep 2>/dev/null || sudo ntpdate -u pool.ntp.org 2>/dev/null; echo 'Time sync attempted'; date",
  },
  {
    id: "top_memory_procs",
    label: "Show Memory Hogs",
    description: "List the top 10 processes consuming the most memory",
    category: "Processes",
    risk: "low",
    command: "ps aux --sort=-%mem | awk 'NR<=11 {printf \"%-8s %-6s %-6s %s\\n\", $1, $3\"%cpu\", $4\"%mem\", $11}'",
  },
  {
    id: "check_disk_io",
    label: "Disk I/O Stats",
    description: "Check disk read/write throughput and IOPS",
    category: "Storage",
    risk: "low",
    command: "iostat -x 1 2 2>/dev/null | tail -20 || echo 'iostat not available - install sysstat package'",
  },
];

router.post("/node-diagnostics/:machineId/scan", async (req, res) => {
  try {
    const machineId = parseInt(req.params.machineId);
    const [machine] = await db.select().from(remoteMachinesTable).where(eq(remoteMachinesTable.id, machineId)).limit(1);
    if (!machine) return res.status(404).json({ error: "Machine not found" });

    const credential = decrypt(machine.encryptedCredential);
    const connInfo = { hostname: machine.hostname, port: machine.port, username: machine.username, authMethod: machine.authMethod, credential };

    const results: Record<string, any> = {};
    const startTime = Date.now();

    for (const check of DIAGNOSTIC_CHECKS) {
      try {
        const raw = await sshExec(connInfo, check.command, 15000);
        const parsed = check.parser(raw);
        results[check.id] = {
          id: check.id,
          label: check.label,
          category: check.category,
          ...parsed,
        };
      } catch (err: any) {
        results[check.id] = {
          id: check.id,
          label: check.label,
          category: check.category,
          status: "critical",
          value: "Error",
          detail: err.message,
        };
      }
    }

    const elapsed = Date.now() - startTime;
    const statuses = Object.values(results).map((r: any) => r.status);
    const criticalCount = statuses.filter(s => s === "critical").length;
    const warningCount = statuses.filter(s => s === "warning").length;
    const healthyCount = statuses.filter(s => s === "healthy").length;

    let overallHealth: string;
    let score: number;
    if (criticalCount > 2) { overallHealth = "critical"; score = Math.max(0, 30 - criticalCount * 5); }
    else if (criticalCount > 0) { overallHealth = "warning"; score = Math.max(20, 60 - criticalCount * 15 - warningCount * 5); }
    else if (warningCount > 2) { overallHealth = "warning"; score = Math.max(50, 80 - warningCount * 5); }
    else { overallHealth = "healthy"; score = Math.min(100, 85 + healthyCount); }

    logActivity({
      action: "node_diagnostic_scan",
      category: "node_diagnostics",
      source: "system",
      detail: `Diagnostic scan on ${machine.name}: ${overallHealth} (score: ${score})`,
      severity: overallHealth === "critical" ? "high" : overallHealth === "warning" ? "medium" : "info",
    });

    return res.json({
      machineId: machine.id,
      machineName: machine.name,
      hostname: machine.hostname,
      scanTime: new Date().toISOString(),
      elapsed,
      overallHealth,
      score,
      summary: { critical: criticalCount, warning: warningCount, healthy: healthyCount, total: statuses.length },
      checks: results,
    });
  } catch (err: any) {
    console.error("[Node Diagnostics] Scan error:", err.message);
    const safeMsg = err.message?.includes("SSH") || err.message?.includes("connect") || err.message?.includes("timed out")
      ? "Failed to connect to the machine. Check that it's online and credentials are valid."
      : "Diagnostic scan failed. Check server logs for details.";
    return res.status(500).json({ error: safeMsg });
  }
});

router.get("/node-diagnostics/actions", (_req, res) => {
  return res.json({
    actions: OPTIMIZATION_ACTIONS.map(a => ({
      id: a.id,
      label: a.label,
      description: a.description,
      category: a.category,
      risk: a.risk,
    })),
  });
});

router.post("/node-diagnostics/:machineId/optimize/:actionId", requireSuperadmin, async (req, res) => {
  try {
    const machineId = parseInt(req.params.machineId);
    const actionId = req.params.actionId;

    const action = OPTIMIZATION_ACTIONS.find(a => a.id === actionId);
    if (!action) return res.status(404).json({ error: "Unknown optimization action" });

    const [machine] = await db.select().from(remoteMachinesTable).where(eq(remoteMachinesTable.id, machineId)).limit(1);
    if (!machine) return res.status(404).json({ error: "Machine not found" });

    const credential = decrypt(machine.encryptedCredential);
    const connInfo = { hostname: machine.hostname, port: machine.port, username: machine.username, authMethod: machine.authMethod, credential };

    const output = await sshExec(connInfo, action.command, 30000);

    logActivity({
      action: "node_optimization_run",
      category: "node_diagnostics",
      source: req.user?.username || "system",
      detail: `Ran optimization "${action.label}" on ${machine.name}: ${output.substring(0, 100)}`,
      severity: action.risk === "high" ? "high" : "info",
    });

    return res.json({
      actionId: action.id,
      label: action.label,
      machineName: machine.name,
      output: output.trim(),
      success: true,
    });
  } catch (err: any) {
    console.error("[Node Diagnostics] Optimize error:", err.message);
    const safeMsg = err.message?.includes("SSH") || err.message?.includes("connect") || err.message?.includes("timed out")
      ? "Failed to connect to the machine. Check that it's online and accessible."
      : "Optimization action failed. Check server logs for details.";
    return res.status(500).json({ error: safeMsg });
  }
});

export default router;
