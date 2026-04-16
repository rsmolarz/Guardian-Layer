import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { remoteMachinesTable, maintenanceJobsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { logActivity } from "../lib/activity-logger";
import { requireSuperadmin } from "../middleware/auth";
import crypto from "crypto";
import { Client } from "ssh2";

const router: IRouter = Router();

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

// PATCHED: APP_ENCRYPTION_KEY is the source of truth (was sha256(DATABASE_URL)).
// Two-layer check:
//   (1) IIFE throws at module load -- server fails fast at boot like JWT_SECRET.
//   (2) getEncryptionKey() re-checks at call time -- defense-in-depth if (1) is ever removed.
// No silent fallbacks.
(() => {
  if (!process.env.APP_ENCRYPTION_KEY) {
    throw new Error("APP_ENCRYPTION_KEY environment variable is required at startup.");
  }
})();

function getEncryptionKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("APP_ENCRYPTION_KEY environment variable is required for encryption operations.");
  }
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

interface MaintenanceTask {
  id: string;
  label: string;
  description: string;
  category: string;
  os: string[];
  commands: { os: string; cmds: string[] }[];
  risk: "low" | "medium" | "high";
}

const MAINTENANCE_TASKS: MaintenanceTask[] = [
  {
    id: "clear-temp",
    label: "Clear Temporary Files",
    description: "Remove temporary files, system caches, and crash dumps to free up disk space",
    category: "Disk Cleanup",
    os: ["linux", "macos", "windows"],
    commands: [
      { os: "linux", cmds: [
        "sudo rm -rf /tmp/* /var/tmp/* 2>/dev/null; echo 'Cleared /tmp and /var/tmp'",
        "sudo journalctl --vacuum-time=7d 2>/dev/null; echo 'Cleared old journal logs'",
        "sudo rm -rf /var/cache/apt/archives/*.deb 2>/dev/null; echo 'Cleared apt cache'",
      ]},
      { os: "macos", cmds: [
        "rm -rf ~/Library/Caches/* 2>/dev/null; echo 'Cleared user caches'",
        "sudo rm -rf /Library/Caches/* 2>/dev/null; echo 'Cleared system caches'",
        "rm -rf ~/Library/Logs/* 2>/dev/null; echo 'Cleared user logs'",
      ]},
      { os: "windows", cmds: [
        "del /q/f/s %TEMP%\\* 2>nul & echo Cleared TEMP folder",
        "del /q/f/s C:\\Windows\\Temp\\* 2>nul & echo Cleared Windows Temp",
        "cleanmgr /sagerun:1 & echo Ran Disk Cleanup",
      ]},
    ],
    risk: "low",
  },
  {
    id: "clear-browser-cache",
    label: "Clear Browser Caches",
    description: "Remove cached browser data (Chrome, Firefox, Edge) to free space and resolve stale content issues",
    category: "Disk Cleanup",
    os: ["linux", "macos", "windows"],
    commands: [
      { os: "linux", cmds: [
        "rm -rf ~/.cache/google-chrome/Default/Cache/* ~/.cache/google-chrome/Default/Code\\ Cache/* 2>/dev/null; echo 'Cleared Chrome cache'",
        "rm -rf ~/.cache/mozilla/firefox/*.default*/cache2/* 2>/dev/null; echo 'Cleared Firefox cache'",
        "rm -rf ~/.cache/BraveSoftware/Brave-Browser/Default/Cache/* 2>/dev/null; echo 'Cleared Brave cache'",
      ]},
      { os: "macos", cmds: [
        "rm -rf ~/Library/Caches/Google/Chrome/Default/Cache/* 2>/dev/null; echo 'Cleared Chrome cache'",
        "rm -rf ~/Library/Caches/Firefox/Profiles/*.default*/cache2/* 2>/dev/null; echo 'Cleared Firefox cache'",
        "rm -rf ~/Library/Caches/com.apple.Safari/Cache.db 2>/dev/null; echo 'Cleared Safari cache'",
      ]},
      { os: "windows", cmds: [
        "del /q/f/s \"%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Cache\\*\" 2>nul & echo Cleared Chrome cache",
        "del /q/f/s \"%LOCALAPPDATA%\\Mozilla\\Firefox\\Profiles\\*.default*\\cache2\\*\" 2>nul & echo Cleared Firefox cache",
      ]},
    ],
    risk: "low",
  },
  {
    id: "flush-dns",
    label: "Flush DNS Cache",
    description: "Clear the DNS resolver cache to fix stale DNS records and improve name resolution",
    category: "Network",
    os: ["linux", "macos", "windows"],
    commands: [
      { os: "linux", cmds: ["sudo systemd-resolve --flush-caches 2>/dev/null || sudo resolvectl flush-caches 2>/dev/null; echo 'DNS cache flushed'"] },
      { os: "macos", cmds: ["sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder; echo 'DNS cache flushed'"] },
      { os: "windows", cmds: ["ipconfig /flushdns"] },
    ],
    risk: "low",
  },
  {
    id: "disk-usage",
    label: "Analyze Disk Usage",
    description: "Show disk space usage and identify the largest files/directories consuming storage",
    category: "Diagnostics",
    os: ["linux", "macos", "windows"],
    commands: [
      { os: "linux", cmds: [
        "df -h --output=source,fstype,size,used,avail,pcent,target | head -20",
        "du -sh /home/*/ /var/log/ /tmp/ /var/cache/ 2>/dev/null | sort -rh | head -15",
      ]},
      { os: "macos", cmds: [
        "df -h",
        "du -sh ~/Downloads ~/Library/Caches ~/Library/Logs ~/.Trash 2>/dev/null | sort -rh",
      ]},
      { os: "windows", cmds: [
        "wmic logicaldisk get size,freespace,caption",
        "dir /s /a C:\\Users\\%USERNAME%\\Downloads 2>nul | find \"File(s)\"",
      ]},
    ],
    risk: "low",
  },
  {
    id: "check-updates",
    label: "Check for System Updates",
    description: "List available system and security updates without installing them",
    category: "Updates",
    os: ["linux", "macos", "windows"],
    commands: [
      { os: "linux", cmds: [
        "sudo apt update -qq 2>/dev/null && apt list --upgradable 2>/dev/null | head -20 || sudo dnf check-update 2>/dev/null | head -20",
      ]},
      { os: "macos", cmds: [
        "softwareupdate --list 2>&1",
      ]},
      { os: "windows", cmds: [
        "powershell -Command \"Get-WindowsUpdate -AcceptAll -IgnoreReboot 2>$null | Select-Object Title,KB,Size | Format-Table -AutoSize\" 2>nul || echo Use Settings > Windows Update to check",
      ]},
    ],
    risk: "low",
  },
  {
    id: "install-updates",
    label: "Install System Updates",
    description: "Download and install all available system and security updates",
    category: "Updates",
    os: ["linux", "macos"],
    commands: [
      { os: "linux", cmds: [
        "sudo apt update -qq 2>/dev/null && sudo apt upgrade -y 2>/dev/null || sudo dnf upgrade -y 2>/dev/null; echo 'System updates installed'",
      ]},
      { os: "macos", cmds: [
        "sudo softwareupdate --install --all --agree-to-license 2>&1; echo 'Updates installed'",
      ]},
    ],
    risk: "high",
  },
  {
    id: "check-running-procs",
    label: "Check Resource-Hungry Processes",
    description: "Identify processes consuming the most CPU and memory to find performance bottlenecks",
    category: "Performance",
    os: ["linux", "macos", "windows"],
    commands: [
      { os: "linux", cmds: [
        "echo '=== TOP CPU ===' && ps aux --sort=-%cpu | head -15",
        "echo '=== TOP MEMORY ===' && ps aux --sort=-%mem | head -15",
        "echo '=== MEMORY INFO ===' && free -h",
      ]},
      { os: "macos", cmds: [
        "echo '=== TOP CPU ===' && ps aux -r | head -15",
        "echo '=== TOP MEMORY ===' && ps aux -m | head -15",
        "echo '=== MEMORY PRESSURE ===' && memory_pressure | head -5",
      ]},
      { os: "windows", cmds: [
        "powershell -Command \"Get-Process | Sort-Object CPU -Descending | Select-Object -First 15 Name,CPU,WorkingSet64 | Format-Table -AutoSize\"",
      ]},
    ],
    risk: "low",
  },
  {
    id: "check-startup",
    label: "List Startup Programs",
    description: "Show all programs configured to start automatically at boot — useful for removing unnecessary startup items",
    category: "Performance",
    os: ["linux", "macos", "windows"],
    commands: [
      { os: "linux", cmds: [
        "systemctl list-unit-files --type=service --state=enabled 2>/dev/null | head -30",
        "ls -la /etc/xdg/autostart/ ~/.config/autostart/ 2>/dev/null",
      ]},
      { os: "macos", cmds: [
        "echo '=== Login Items ===' && osascript -e 'tell application \"System Events\" to get the name of every login item' 2>/dev/null",
        "echo '=== Launch Agents ===' && ls ~/Library/LaunchAgents/ /Library/LaunchAgents/ 2>/dev/null",
        "echo '=== Launch Daemons ===' && ls /Library/LaunchDaemons/ 2>/dev/null | head -20",
      ]},
      { os: "windows", cmds: [
        "powershell -Command \"Get-CimInstance Win32_StartupCommand | Select-Object Name,Command,Location | Format-Table -AutoSize\"",
        "wmic startup list brief",
      ]},
    ],
    risk: "low",
  },
  {
    id: "security-audit",
    label: "Security Quick Audit",
    description: "Run basic security checks — open ports, firewall status, failed logins, and SSH config",
    category: "Security",
    os: ["linux", "macos"],
    commands: [
      { os: "linux", cmds: [
        "echo '=== OPEN PORTS ===' && ss -tulnp 2>/dev/null | head -20 || netstat -tulnp 2>/dev/null | head -20",
        "echo '=== FIREWALL ===' && sudo ufw status 2>/dev/null || sudo iptables -L -n 2>/dev/null | head -20",
        "echo '=== FAILED LOGINS ===' && sudo lastb 2>/dev/null | head -10 || echo 'No failed login data'",
        "echo '=== SSH CONFIG ===' && grep -E '^(PermitRootLogin|PasswordAuthentication|PubkeyAuthentication)' /etc/ssh/sshd_config 2>/dev/null",
      ]},
      { os: "macos", cmds: [
        "echo '=== OPEN PORTS ===' && lsof -iTCP -sTCP:LISTEN -P | head -20",
        "echo '=== FIREWALL ===' && /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate",
        "echo '=== FILEVAULT ===' && fdesetup status",
        "echo '=== SIP STATUS ===' && csrutil status 2>/dev/null",
      ]},
    ],
    risk: "low",
  },
  {
    id: "clean-old-logs",
    label: "Clean Old Log Files",
    description: "Remove old log files and rotated logs older than 7 days to reclaim disk space",
    category: "Disk Cleanup",
    os: ["linux", "macos"],
    commands: [
      { os: "linux", cmds: [
        "sudo find /var/log -name '*.gz' -mtime +7 -delete 2>/dev/null; echo 'Removed compressed logs older than 7 days'",
        "sudo find /var/log -name '*.old' -delete 2>/dev/null; echo 'Removed .old log files'",
        "sudo journalctl --vacuum-time=7d 2>/dev/null; echo 'Vacuumed journal logs'",
      ]},
      { os: "macos", cmds: [
        "sudo rm -rf /var/log/asl/*.asl 2>/dev/null; echo 'Cleared ASL logs'",
        "rm -rf ~/Library/Logs/*.log 2>/dev/null; echo 'Cleared user log files'",
      ]},
    ],
    risk: "low",
  },
  {
    id: "empty-trash",
    label: "Empty Trash / Recycle Bin",
    description: "Permanently delete all files in the trash/recycle bin to reclaim disk space",
    category: "Disk Cleanup",
    os: ["linux", "macos", "windows"],
    commands: [
      { os: "linux", cmds: ["rm -rf ~/.local/share/Trash/*/* ~/.local/share/Trash/info/* 2>/dev/null; echo 'Trash emptied'"] },
      { os: "macos", cmds: ["rm -rf ~/.Trash/* 2>/dev/null; echo 'Trash emptied'"] },
      { os: "windows", cmds: ["powershell -Command \"Clear-RecycleBin -Force -ErrorAction SilentlyContinue; echo 'Recycle Bin emptied'\""] },
    ],
    risk: "low",
  },
  {
    id: "system-info",
    label: "System Information",
    description: "Collect system specs — OS version, CPU, RAM, disk, uptime, and network interfaces",
    category: "Diagnostics",
    os: ["linux", "macos", "windows"],
    commands: [
      { os: "linux", cmds: [
        "echo '=== OS ===' && cat /etc/os-release | head -5",
        "echo '=== CPU ===' && lscpu | grep -E 'Model name|CPU\\(s\\)|Thread' | head -5",
        "echo '=== RAM ===' && free -h | head -3",
        "echo '=== DISK ===' && df -h / | tail -1",
        "echo '=== UPTIME ===' && uptime",
      ]},
      { os: "macos", cmds: [
        "echo '=== OS ===' && sw_vers",
        "echo '=== CPU ===' && sysctl -n machdep.cpu.brand_string",
        "echo '=== RAM ===' && sysctl -n hw.memsize | awk '{print $1/1073741824 \" GB\"}'",
        "echo '=== DISK ===' && df -h / | tail -1",
        "echo '=== UPTIME ===' && uptime",
      ]},
      { os: "windows", cmds: [
        "systeminfo | findstr /B /C:\"OS Name\" /C:\"OS Version\" /C:\"System Type\" /C:\"Total Physical Memory\"",
        "wmic cpu get name",
        "wmic logicaldisk get size,freespace,caption",
      ]},
    ],
    risk: "low",
  },
];

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

async function detectOS(machine: { hostname: string; port: number; username: string; authMethod: string; credential: string }): Promise<string> {
  try {
    const result = await sshExec(machine, "uname -s 2>/dev/null || echo UNKNOWN", 10000);
    const os = result.trim().toLowerCase();
    if (os.includes("darwin")) return "macos";
    if (os.includes("linux")) return "linux";
    if (os.includes("mingw") || os.includes("cygwin") || os.includes("msys")) return "windows";
    const winCheck = await sshExec(machine, "ver 2>nul || echo notwin", 5000);
    if (winCheck.includes("Windows")) return "windows";
    return "linux";
  } catch {
    return "linux";
  }
}

router.get("/remote-machines", async (_req, res) => {
  try {
    const machines = await db.select({
      id: remoteMachinesTable.id,
      name: remoteMachinesTable.name,
      hostname: remoteMachinesTable.hostname,
      port: remoteMachinesTable.port,
      username: remoteMachinesTable.username,
      authMethod: remoteMachinesTable.authMethod,
      os: remoteMachinesTable.os,
      osVersion: remoteMachinesTable.osVersion,
      lastSeen: remoteMachinesTable.lastSeen,
      lastMaintenanceAt: remoteMachinesTable.lastMaintenanceAt,
      active: remoteMachinesTable.active,
      tags: remoteMachinesTable.tags,
      createdAt: remoteMachinesTable.createdAt,
    }).from(remoteMachinesTable).orderBy(desc(remoteMachinesTable.createdAt));
    return res.json({ machines });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/remote-machines", async (req, res) => {
  try {
    const { name, hostname, port, username, authMethod, credential, tags } = req.body;
    if (!name || !hostname || !username || !credential) {
      return res.status(400).json({ error: "Name, hostname, username, and credential are required" });
    }

    const encryptedCredential = encrypt(credential);

    const [machine] = await db.insert(remoteMachinesTable).values({
      name,
      hostname,
      port: port || 22,
      username,
      authMethod: authMethod || "password",
      encryptedCredential,
      tags: tags || null,
    }).returning();

    logActivity({
      action: "remote_machine_added",
      category: "remote_maintenance",
      source: "system",
      detail: `Registered machine: ${name} (${hostname})`,
      severity: "info",
    });

    return res.json({ machine: { ...machine, encryptedCredential: undefined } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/remote-machines/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(remoteMachinesTable).where(eq(remoteMachinesTable.id, id));
    logActivity({
      action: "remote_machine_removed",
      category: "remote_maintenance",
      source: "system",
      detail: `Removed machine ID: ${id}`,
      severity: "info",
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/remote-machines/:id/test", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [machine] = await db.select().from(remoteMachinesTable).where(eq(remoteMachinesTable.id, id)).limit(1);
    if (!machine) return res.status(404).json({ error: "Machine not found" });

    const credential = decrypt(machine.encryptedCredential);
    const connInfo = { hostname: machine.hostname, port: machine.port, username: machine.username, authMethod: machine.authMethod, credential };

    const os = await detectOS(connInfo);
    let osVersion = "";
    try {
      if (os === "macos") osVersion = (await sshExec(connInfo, "sw_vers -productVersion", 5000)).trim();
      else if (os === "linux") osVersion = (await sshExec(connInfo, "cat /etc/os-release | grep PRETTY_NAME | cut -d'\"' -f2", 5000)).trim();
      else osVersion = (await sshExec(connInfo, "ver", 5000)).trim();
    } catch {}

    await db.update(remoteMachinesTable).set({
      os,
      osVersion: osVersion || null,
      lastSeen: new Date(),
      updatedAt: new Date(),
    }).where(eq(remoteMachinesTable.id, id));

    return res.json({ success: true, os, osVersion, message: `Connected successfully to ${machine.hostname}` });
  } catch (err: any) {
    return res.json({ success: false, error: err.message });
  }
});

router.get("/remote-maintenance/tasks", (_req, res) => {
  const tasks = MAINTENANCE_TASKS.map(t => ({
    id: t.id,
    label: t.label,
    description: t.description,
    category: t.category,
    os: t.os,
    risk: t.risk,
  }));
  return res.json({ tasks });
});

router.post("/remote-maintenance/run", async (req, res) => {
  try {
    const { machineId, taskId } = req.body;
    if (!machineId || !taskId) {
      return res.status(400).json({ error: "machineId and taskId are required" });
    }

    const [machine] = await db.select().from(remoteMachinesTable).where(eq(remoteMachinesTable.id, machineId)).limit(1);
    if (!machine) return res.status(404).json({ error: "Machine not found" });

    const task = MAINTENANCE_TASKS.find(t => t.id === taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    const credential = decrypt(machine.encryptedCredential);
    const connInfo = { hostname: machine.hostname, port: machine.port, username: machine.username, authMethod: machine.authMethod, credential };

    let os = machine.os || "linux";
    if (!machine.os) {
      os = await detectOS(connInfo);
      await db.update(remoteMachinesTable).set({ os, updatedAt: new Date() }).where(eq(remoteMachinesTable.id, machineId));
    }

    const commandSet = task.commands.find(c => c.os === os);
    if (!commandSet) {
      return res.status(400).json({ error: `Task "${task.label}" is not supported on ${os}` });
    }

    const [job] = await db.insert(maintenanceJobsTable).values({
      machineId,
      taskType: taskId,
      status: "running",
      startedAt: new Date(),
    }).returning();

    let fullOutput = "";
    let hasError = false;

    for (const cmd of commandSet.cmds) {
      try {
        const result = await sshExec(connInfo, cmd, 60000);
        fullOutput += `$ ${cmd}\n${result}\n\n`;
      } catch (err: any) {
        fullOutput += `$ ${cmd}\n[ERROR] ${err.message}\n\n`;
        hasError = true;
      }
    }

    await db.update(maintenanceJobsTable).set({
      status: hasError ? "partial" : "completed",
      output: fullOutput,
      completedAt: new Date(),
    }).where(eq(maintenanceJobsTable.id, job.id));

    await db.update(remoteMachinesTable).set({
      lastMaintenanceAt: new Date(),
      lastSeen: new Date(),
      updatedAt: new Date(),
    }).where(eq(remoteMachinesTable.id, machineId));

    logActivity({
      action: "remote_maintenance_run",
      category: "remote_maintenance",
      source: "system",
      detail: `Ran "${task.label}" on ${machine.name} (${machine.hostname}) — ${hasError ? "partial" : "completed"}`,
      severity: hasError ? "medium" : "info",
    });

    return res.json({
      jobId: job.id,
      status: hasError ? "partial" : "completed",
      task: task.label,
      machine: machine.name,
      output: fullOutput,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/remote-maintenance/run-all", requireSuperadmin, async (req, res) => {
  try {
    const { taskId, machineIds } = req.body;
    if (!taskId) {
      return res.status(400).json({ error: "taskId is required" });
    }

    const task = MAINTENANCE_TASKS.find(t => t.id === taskId);
    if (!task) return res.status(404).json({ error: "Task not found" });

    let allMachines;
    if (machineIds && Array.isArray(machineIds) && machineIds.length > 0) {
      const all = await db.select().from(remoteMachinesTable);
      allMachines = all.filter(m => machineIds.includes(m.id));
    } else {
      allMachines = await db.select().from(remoteMachinesTable);
    }

    if (allMachines.length === 0) {
      return res.status(400).json({ error: "No machines found" });
    }

    const results: { machineId: number; machineName: string; hostname: string; status: string; output: string; jobId: number }[] = [];

    const batchSize = 5;
    for (let i = 0; i < allMachines.length; i += batchSize) {
      const batch = allMachines.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch.map(async (machine) => {
        try {
          const credential = decrypt(machine.encryptedCredential);
          const connInfo = { hostname: machine.hostname, port: machine.port, username: machine.username, authMethod: machine.authMethod, credential };

          let os = machine.os || "";
          if (!os) {
            try {
              os = await detectOS(connInfo);
              await db.update(remoteMachinesTable).set({ os, updatedAt: new Date() }).where(eq(remoteMachinesTable.id, machine.id));
            } catch {
              os = "linux";
            }
          }

          const commandSet = task.commands.find(c => c.os === os);
          if (!commandSet) {
            return { machineId: machine.id, machineName: machine.name, hostname: machine.hostname, status: "skipped", output: `Task "${task.label}" not supported on ${os}`, jobId: 0 };
          }

          const [job] = await db.insert(maintenanceJobsTable).values({
            machineId: machine.id,
            taskType: taskId,
            status: "running",
            startedAt: new Date(),
          }).returning();

          let fullOutput = "";
          let hasError = false;

          for (const cmd of commandSet.cmds) {
            try {
              const result = await sshExec(connInfo, cmd, 60000);
              fullOutput += `$ ${cmd}\n${result}\n\n`;
            } catch (err: any) {
              fullOutput += `$ ${cmd}\n[ERROR] ${err.message}\n\n`;
              hasError = true;
            }
          }

          const finalStatus = hasError ? "partial" : "completed";
          await db.update(maintenanceJobsTable).set({
            status: finalStatus,
            output: fullOutput,
            completedAt: new Date(),
          }).where(eq(maintenanceJobsTable.id, job.id));

          await db.update(remoteMachinesTable).set({
            lastMaintenanceAt: new Date(),
            lastSeen: new Date(),
            updatedAt: new Date(),
          }).where(eq(remoteMachinesTable.id, machine.id));

          return { machineId: machine.id, machineName: machine.name, hostname: machine.hostname, status: finalStatus, output: fullOutput, jobId: job.id };
        } catch (err: any) {
          return { machineId: machine.id, machineName: machine.name, hostname: machine.hostname, status: "error", output: err.message || "Connection failed", jobId: 0 };
        }
      }));

      for (const r of batchResults) {
        if (r.status === "fulfilled") {
          results.push(r.value);
        } else {
          results.push({ machineId: 0, machineName: "unknown", hostname: "", status: "error", output: r.reason?.message || "Unknown error", jobId: 0 });
        }
      }
    }

    const completed = results.filter(r => r.status === "completed").length;
    const partial = results.filter(r => r.status === "partial").length;
    const errors = results.filter(r => r.status === "error").length;
    const skipped = results.filter(r => r.status === "skipped").length;

    logActivity({
      action: "remote_maintenance_run_all",
      category: "remote_maintenance",
      source: "system",
      detail: `Ran "${task.label}" on ${results.length} machines — ${completed} completed, ${partial} partial, ${errors} errors, ${skipped} skipped`,
      severity: errors > 0 ? "medium" : "info",
    });

    return res.json({
      task: task.label,
      totalMachines: compatibleMachines.length,
      summary: { completed, partial, errors, skipped },
      results,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/remote-maintenance/history/:machineId", async (req, res) => {
  try {
    const machineId = parseInt(req.params.machineId);
    const jobs = await db.select().from(maintenanceJobsTable)
      .where(eq(maintenanceJobsTable.machineId, machineId))
      .orderBy(desc(maintenanceJobsTable.createdAt))
      .limit(20);
    return res.json({ jobs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

const TS_API_BASE = "https://api.tailscale.com/api/v2";

async function tailscaleFetch(path: string) {
  const key = process.env.TAILSCALE_API_KEY;
  if (!key) throw new Error("TAILSCALE_API_KEY not configured");
  const res = await fetch(`${TS_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Tailscale API error: ${res.status} ${res.statusText}`);
  return res.json();
}

function mapTailscaleOs(os: string): string {
  if (!os) return "unknown";
  const lower = os.toLowerCase();
  if (lower === "macos") return "darwin";
  if (lower === "windows") return "windows";
  if (lower === "linux") return "linux";
  if (lower === "ios" || lower === "android") return lower;
  return lower;
}

router.get("/tailscale/devices", async (_req, res): Promise<void> => {
  try {
    const data = await tailscaleFetch("/tailnet/-/devices");
    const existingMachines = await db.select({ hostname: remoteMachinesTable.hostname })
      .from(remoteMachinesTable);
    const registeredIps = new Set(existingMachines.map((m) => m.hostname));

    const devices = data.devices.map((d: any) => ({
      id: d.id,
      nodeId: d.nodeId,
      name: d.name,
      hostname: d.hostname,
      tailscaleIp: d.addresses?.[0] || null,
      ipv6: d.addresses?.[1] || null,
      os: d.os,
      normalizedOs: mapTailscaleOs(d.os),
      online: d.connectedToControl ?? false,
      lastSeen: d.lastSeen,
      clientVersion: d.clientVersion,
      updateAvailable: d.updateAvailable ?? false,
      authorized: d.authorized ?? false,
      expires: d.expires,
      keyExpiryDisabled: d.keyExpiryDisabled ?? false,
      created: d.created,
      alreadyRegistered: registeredIps.has(d.addresses?.[0]),
    }));

    const summary = {
      total: devices.length,
      online: devices.filter((d: any) => d.online).length,
      offline: devices.filter((d: any) => !d.online).length,
      registered: devices.filter((d: any) => d.alreadyRegistered).length,
      osCounts: {} as Record<string, number>,
    };

    for (const d of devices) {
      const os = (d as any).os || "unknown";
      summary.osCounts[os] = (summary.osCounts[os] || 0) + 1;
    }

    res.json({ devices, summary });
  } catch (err: any) {
    console.error("[tailscale] GET /devices failed:", err.message);
    const status = err.message.includes("not configured") ? 503 : 502;
    res.status(status).json({ error: err.message });
  }
});

router.post("/tailscale/import", async (req, res): Promise<void> => {
  try {
    const { devices } = req.body;
    if (!Array.isArray(devices) || devices.length === 0) {
      res.status(400).json({ error: "devices array required" });
      return;
    }

    const results: { hostname: string; status: string; id?: number }[] = [];

    for (const dev of devices) {
      const { hostname, tailscaleIp, os, username, sshPort } = dev;
      if (!tailscaleIp || !hostname) {
        results.push({ hostname: hostname || "unknown", status: "skipped: missing data" });
        continue;
      }

      const existing = await db.select({ id: remoteMachinesTable.id })
        .from(remoteMachinesTable)
        .where(eq(remoteMachinesTable.hostname, tailscaleIp))
        .limit(1);

      if (existing.length > 0) {
        results.push({ hostname, status: "already_registered", id: existing[0].id });
        continue;
      }

      const [machine] = await db.insert(remoteMachinesTable).values({
        name: hostname,
        hostname: tailscaleIp,
        port: sshPort || 22,
        username: username || "root",
        authMethod: "password",
        encryptedCredential: encrypt(""),
        os: mapTailscaleOs(os),
        active: true,
        tags: ["tailscale", "auto-imported"],
      }).returning({ id: remoteMachinesTable.id });

      await logActivity({
        type: "system_change",
        severity: "low",
        title: `Imported Tailscale device: ${hostname}`,
        details: `Auto-imported ${hostname} (${tailscaleIp}) from Tailscale network. OS: ${os}`,
      });

      results.push({ hostname, status: "imported", id: machine.id });
    }

    res.json({
      imported: results.filter((r) => r.status === "imported").length,
      skipped: results.filter((r) => r.status !== "imported").length,
      results,
    });
  } catch (err: any) {
    console.error("[tailscale] POST /import failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/tailscale/status", async (_req, res): Promise<void> => {
  try {
    const key = process.env.TAILSCALE_API_KEY;
    if (!key) {
      res.json({ configured: false });
      return;
    }
    const data = await tailscaleFetch("/tailnet/-/devices");
    res.json({
      configured: true,
      deviceCount: data.devices?.length ?? 0,
      onlineCount: data.devices?.filter((d: any) => d.connectedToControl).length ?? 0,
    });
  } catch (err: any) {
    res.json({ configured: true, error: err.message });
  }
});

export default router;
