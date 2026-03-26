import paramiko
import logging
import base64
import os
import io
from typing import Tuple, Optional
from config import settings

logger = logging.getLogger(__name__)


def _get_private_key() -> Optional[paramiko.PKey]:
    """Load SSH private key from file path or base64 env var."""
    # Option 1: path to key file
    if settings.SSH_PRIVATE_KEY_PATH and os.path.exists(settings.SSH_PRIVATE_KEY_PATH):
        return paramiko.RSAKey.from_private_key_file(settings.SSH_PRIVATE_KEY_PATH)
    # Option 2: base64-encoded key in env/secret (preferred for Replit)
    if settings.SSH_PRIVATE_KEY_B64:
        key_bytes = base64.b64decode(settings.SSH_PRIVATE_KEY_B64)
        key_file = io.StringIO(key_bytes.decode("utf-8"))
        return paramiko.RSAKey.from_private_key(key_file)
    return None


def ssh_run(
    host: str,
    commands: list[str],
    port: int = 22,
    timeout: int = 120,
) -> Tuple[bool, str]:
    """
    Execute a list of shell commands sequentially on a remote host via SSH.
    Returns (success: bool, combined_output: str).

    host format: "user@hostname" or just "hostname" (user defaults to root)
    """
    if "@" in host:
        user, hostname = host.split("@", 1)
    else:
        user, hostname = "root", host

    pkey = _get_private_key()
    if pkey is None:
        return False, "SSH private key not configured. Set SSH_PRIVATE_KEY_B64 in Secrets."

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    output_lines = []
    try:
        client.connect(hostname, port=port, username=user, pkey=pkey, timeout=timeout)
        for cmd in commands:
            logger.info("[SSH %s] Running: %s", hostname, cmd)
            stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
            out = stdout.read().decode("utf-8", errors="replace").strip()
            err = stderr.read().decode("utf-8", errors="replace").strip()
            exit_code = stdout.channel.recv_exit_status()
            if out:
                output_lines.append(f"[stdout] {out}")
            if err:
                output_lines.append(f"[stderr] {err}")
            if exit_code != 0:
                output_lines.append(f"[exit {exit_code}] command failed: {cmd}")
                return False, "\n".join(output_lines)
        return True, "\n".join(output_lines)
    except Exception as e:
        msg = f"SSH connection/execution error: {e}"
        logger.error(msg)
        return False, msg
    finally:
        client.close()
