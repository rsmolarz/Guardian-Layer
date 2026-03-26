"""
GuardianLayer Agents
────────────────────
Each agent is a standalone function that can be enqueued as an RQ job.

Agents:
  • CodeGuardianAgent  — runs linting/security scan via GitHub API
  • UpgradeAgent       — checks for outdated deps, opens GitHub PRs
  • HealthCheckAgent   — HTTP health-check for all running apps
  • DatabaseAgent      — checks DB connectivity inside container
"""
import logging
import httpx
import json
from datetime import datetime
from sqlmodel import Session, select
from database import engine
from models import App, AppStatus, AgentDefinition, IncidentLog, IncidentLevel
from notifications import alert

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────

def _github_headers() -> dict:
    from config import settings
    token = settings.GITHUB_TOKEN
    if not token:
        raise RuntimeError("GITHUB_TOKEN not configured in secrets.")
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _log_incident(app_id, level, category, message, agent_id=None):
    with Session(engine) as session:
        session.add(IncidentLog(
            app_id=app_id,
            agent_id=agent_id,
            level=level,
            category=category,
            message=message,
        ))
        session.commit()


# ────────────────────────────────────────────────────────────────
# 1. HealthCheck Agent
# ────────────────────────────────────────────────────────────────

def health_check_all_apps() -> dict:
    """
    HTTP GET health check for every running app.
    Marks app as failed if unreachable; triggers redeploy alert.
    """
    results = {}
    with Session(engine) as session:
        apps = session.exec(select(App).where(App.status == AppStatus.running)).all()

    for app in apps:
        url = _infer_health_url(app)
        ok, status_code, error = _http_check(url)

        if ok:
            results[app.name] = {"status": "healthy", "http_status": status_code}
            logger.info("[HealthCheck] %s → OK (%d)", app.name, status_code)
        else:
            results[app.name] = {"status": "unhealthy", "error": error}
            logger.warning("[HealthCheck] %s → UNHEALTHY: %s", app.name, error)
            _log_incident(
                app.id, IncidentLevel.error, "health",
                f"Health check FAILED for {app.name} at {url}: {error}"
            )
            alert(
                f"🏥 Health check FAILED: <b>{app.name}</b>\n"
                f"URL: {url}\nError: {error}\nConsider manual redeploy.",
                level="error",
            )

            # Mark app as failed in DB
            with Session(engine) as session:
                db_app = session.get(App, app.id)
                if db_app:
                    db_app.status = AppStatus.failed
                    session.add(db_app)
                    session.commit()

    return results


def _infer_health_url(app: App) -> str:
    """Construct health URL from VPS host and exposed port."""
    hostname = app.vps_host.split("@")[-1] if "@" in app.vps_host else app.vps_host
    return f"http://{hostname}:{app.exposed_port}/health"


def _http_check(url: str, timeout: int = 10):
    try:
        resp = httpx.get(url, timeout=timeout, follow_redirects=True)
        ok = resp.status_code < 500
        return ok, resp.status_code, None
    except Exception as e:
        return False, None, str(e)


# ────────────────────────────────────────────────────────────────
# 2. CodeGuardian Agent
# ────────────────────────────────────────────────────────────────

def code_guardian_scan(app_id: int) -> dict:
    """
    Fetch latest commit from the app's repo and run a basic
    security/lint scan by checking GitHub's code scanning alerts API.
    """
    with Session(engine) as session:
        app = session.get(App, app_id)
        if not app:
            return {"error": "App not found"}

    # Parse owner/repo from URL
    owner, repo = _parse_github_repo(app.repo_url)
    if not owner:
        return {"error": f"Cannot parse GitHub repo from {app.repo_url}"}

    try:
        headers = _github_headers()

        # 1. Get latest commit info
        resp = httpx.get(
            f"https://api.github.com/repos/{owner}/{repo}/commits",
            headers=headers, params={"per_page": 1}, timeout=15
        )
        resp.raise_for_status()
        commits = resp.json()
        latest = commits[0] if commits else {}
        sha = latest.get("sha", "unknown")[:8]

        # 2. Check code scanning alerts (requires Advanced Security or GHAS)
        alerts_resp = httpx.get(
            f"https://api.github.com/repos/{owner}/{repo}/code-scanning/alerts",
            headers=headers, params={"state": "open", "per_page": 10}, timeout=15
        )

        scan_summary = {}
        if alerts_resp.status_code == 200:
            open_alerts = alerts_resp.json()
            scan_summary["open_alerts"] = len(open_alerts)
            if open_alerts:
                _log_incident(
                    app.id, IncidentLevel.warning, "security",
                    f"CodeGuardian: {len(open_alerts)} open code scanning alerts in {owner}/{repo}"
                )
                alert(
                    f"🔍 CodeGuardian: <b>{len(open_alerts)} security alerts</b> in <code>{owner}/{repo}</code>\n"
                    f"Latest commit: <code>{sha}</code>",
                    level="warning"
                )
        else:
            scan_summary["note"] = "Code scanning API not available (requires GHAS)"

        # 3. Check for open Dependabot alerts
        dep_resp = httpx.get(
            f"https://api.github.com/repos/{owner}/{repo}/dependabot/alerts",
            headers=headers, params={"state": "open", "per_page": 10}, timeout=15
        )
        if dep_resp.status_code == 200:
            dep_alerts = dep_resp.json()
            scan_summary["dependabot_alerts"] = len(dep_alerts)
            if dep_alerts:
                _log_incident(
                    app.id, IncidentLevel.warning, "security",
                    f"CodeGuardian: {len(dep_alerts)} Dependabot alerts in {owner}/{repo}"
                )

        _log_incident(app.id, IncidentLevel.info, "agent",
                      f"CodeGuardian scan complete for {app.name} @ {sha}")

        return {"app": app.name, "commit": sha, **scan_summary}

    except Exception as e:
        logger.error("[CodeGuardian] Error: %s", e)
        _log_incident(app.id, IncidentLevel.error, "agent",
                      f"CodeGuardian scan failed: {e}")
        return {"error": str(e)}


# ────────────────────────────────────────────────────────────────
# 3. Upgrade Agent
# ────────────────────────────────────────────────────────────────

def upgrade_agent_run(app_id: int) -> dict:
    """
    Check the app's GitHub repo for outdated dependencies
    via Dependabot alerts, then open a GitHub PR to trigger
    automated dependency updates.
    """
    with Session(engine) as session:
        app = session.get(App, app_id)
        if not app:
            return {"error": "App not found"}

    owner, repo = _parse_github_repo(app.repo_url)
    if not owner:
        return {"error": f"Cannot parse GitHub repo from {app.repo_url}"}

    try:
        headers = _github_headers()

        # Get open Dependabot alerts
        resp = httpx.get(
            f"https://api.github.com/repos/{owner}/{repo}/dependabot/alerts",
            headers=headers, params={"state": "open", "per_page": 20}, timeout=15
        )

        if resp.status_code != 200:
            return {"info": "Dependabot not available on this repo"}

        alerts = resp.json()
        if not alerts:
            return {"result": "No outdated dependencies found"}

        # Build PR body summarizing outdated deps
        packages = [
            f"- **{a['security_advisory']['summary']}** "
            f"({a['dependency']['package']['name']})"
            for a in alerts[:10]
        ]
        body = (
            "## 🤖 GuardianLayer Auto-Upgrade\n\n"
            "The following dependency vulnerabilities/updates were detected:\n\n"
            + "\n".join(packages)
            + "\n\n_Triggered by UpgradeAgent_"
        )

        # Create a PR (you'd need to first push a branch; this creates the PR draft)
        # In practice the branch would be created by a GitHub Action or Dependabot itself
        pr_resp = httpx.post(
            f"https://api.github.com/repos/{owner}/{repo}/pulls",
            headers=headers,
            json={
                "title": f"[GuardianLayer] Dependency upgrades ({len(alerts)} alerts)",
                "body": body,
                "head": "dependabot/auto-upgrade",  # branch Dependabot creates
                "base": "main",
            },
            timeout=15,
        )

        if pr_resp.status_code == 201:
            pr_url = pr_resp.json().get("html_url")
            alert(
                f"⬆️ UpgradeAgent opened PR for <b>{app.name}</b>\n"
                f"<a href='{pr_url}'>{pr_url}</a>\n{len(alerts)} alerts",
                level="info",
            )
            return {"pr_url": pr_url, "alerts": len(alerts)}
        elif pr_resp.status_code == 422:
            return {"info": "PR already exists or branch missing. Dependabot will handle it.", "alerts": len(alerts)}
        else:
            return {"error": pr_resp.text[:200], "status": pr_resp.status_code}

    except Exception as e:
        logger.error("[UpgradeAgent] Error: %s", e)
        return {"error": str(e)}


# ────────────────────────────────────────────────────────────────
# 4. Database Agent
# ────────────────────────────────────────────────────────────────

def database_agent_check(app_id: int) -> dict:
    """
    SSH into VPS and run a connectivity check + size query
    against the Postgres DB inside the app container.
    """
    from ssh_helper import ssh_run

    with Session(engine) as session:
        app = session.get(App, app_id)
        if not app:
            return {"error": "App not found"}

    commands = [
        f"docker exec {app.container_name} sh -c "
        f"'psql $DATABASE_URL -c \"SELECT pg_size_pretty(pg_database_size(current_database())) AS size;\"'",
        f"docker exec {app.container_name} sh -c "
        f"'psql $DATABASE_URL -c \"SELECT count(*) FROM pg_stat_activity WHERE state=\\'active\\';\"'",
    ]
    ok, output = ssh_run(app.vps_host, commands, port=app.vps_port)

    _log_incident(
        app.id,
        IncidentLevel.info if ok else IncidentLevel.warning,
        "database",
        f"DB check {'OK' if ok else 'WARNING'} for {app.name}: {output[:300]}"
    )
    return {"ok": ok, "output": output[:1000]}


# ────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────

def _parse_github_repo(repo_url: str):
    """Extract (owner, repo) from GitHub URL."""
    # Handle: https://github.com/owner/repo or git@github.com:owner/repo.git
    try:
        if "github.com" not in repo_url:
            return None, None
        if repo_url.startswith("git@"):
            path = repo_url.split(":")[-1].replace(".git", "")
        else:
            path = repo_url.split("github.com/")[-1].replace(".git", "")
        owner, repo = path.strip("/").split("/")[:2]
        return owner, repo
    except Exception:
        return None, None
