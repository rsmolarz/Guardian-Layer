from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ─────────────────────────── Enums ───────────────────────────

class AppStatus(str, Enum):
    running = "running"
    stopped = "stopped"
    deploying = "deploying"
    failed = "failed"
    paused = "paused"


class DeployStatus(str, Enum):
    pending = "pending"
    running = "running"
    success = "success"
    failed = "failed"
    rolled_back = "rolled_back"


class BackupType(str, Enum):
    full = "full"
    incremental = "incremental"
    snapshot = "snapshot"


class BackupStatus(str, Enum):
    pending = "pending"
    running = "running"
    success = "success"
    failed = "failed"


class AgentTrigger(str, Enum):
    cron = "cron"
    webhook = "webhook"
    manual = "manual"
    on_deploy = "on_deploy"


class IncidentLevel(str, Enum):
    info = "info"
    warning = "warning"
    error = "error"
    critical = "critical"


# ─────────────────────────── App ───────────────────────────

class AppBase(SQLModel):
    name: str = Field(index=True)
    repo_url: str
    environment: str = Field(default="production")  # production / staging
    vps_host: str                                    # user@host
    vps_port: int = Field(default=22)
    container_name: str
    image_name: str                                  # e.g. ghcr.io/org/app
    exposed_port: int = Field(default=3000)
    current_version: Optional[str] = None
    status: AppStatus = Field(default=AppStatus.stopped)
    risk_score: int = Field(default=0)               # 0-100


class App(AppBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    deployments: List["DeploymentRecord"] = Relationship(back_populates="app")
    backup_policy: Optional["BackupPolicy"] = Relationship(back_populates="app")
    incidents: List["IncidentLog"] = Relationship(back_populates="app")


class AppCreate(AppBase):
    pass


class AppRead(AppBase):
    id: int
    created_at: datetime
    updated_at: datetime


class AppUpdate(SQLModel):
    name: Optional[str] = None
    repo_url: Optional[str] = None
    environment: Optional[str] = None
    vps_host: Optional[str] = None
    image_name: Optional[str] = None
    status: Optional[AppStatus] = None


# ─────────────────────────── AgentDefinition ───────────────────────────

class AgentDefinitionBase(SQLModel):
    name: str = Field(index=True)
    description: Optional[str] = None
    trigger: AgentTrigger = Field(default=AgentTrigger.cron)
    schedule: Optional[str] = None    # cron expression e.g. "0 2 * * *"
    enabled: bool = Field(default=True)
    config_json: Optional[str] = None  # JSON string for agent-specific config


class AgentDefinition(AgentDefinitionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    last_run_at: Optional[datetime] = None
    last_status: Optional[str] = None


class AgentDefinitionCreate(AgentDefinitionBase):
    pass


class AgentDefinitionRead(AgentDefinitionBase):
    id: int
    last_run_at: Optional[datetime]
    last_status: Optional[str]


# ─────────────────────────── BackupPolicy ───────────────────────────

class BackupPolicyBase(SQLModel):
    app_id: int = Field(foreign_key="app.id")
    backup_type: BackupType = Field(default=BackupType.full)
    schedule: str = Field(default="0 3 * * *")   # cron: 3am daily
    retention_days: int = Field(default=7)
    enabled: bool = Field(default=True)
    storage_path: Optional[str] = None           # prefix in bucket


class BackupPolicy(BackupPolicyBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    last_backup_at: Optional[datetime] = None
    last_backup_status: Optional[BackupStatus] = None

    app: Optional[App] = Relationship(back_populates="backup_policy")


class BackupPolicyCreate(BackupPolicyBase):
    pass


class BackupPolicyRead(BackupPolicyBase):
    id: int
    last_backup_at: Optional[datetime]
    last_backup_status: Optional[BackupStatus]


# ─────────────────────────── BackupRecord ───────────────────────────

class BackupRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    app_id: int = Field(foreign_key="app.id", index=True)
    policy_id: Optional[int] = Field(default=None, foreign_key="backuppolicy.id")
    backup_type: BackupType
    status: BackupStatus = Field(default=BackupStatus.pending)
    storage_key: Optional[str] = None   # S3/R2 object key
    size_bytes: Optional[int] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    log: Optional[str] = None
    checksum: Optional[str] = None


# ─────────────────────────── DeploymentRecord ───────────────────────────

class DeploymentRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    app_id: int = Field(foreign_key="app.id", index=True)
    version: str                         # git commit SHA or tag
    image_tag: Optional[str] = None
    status: DeployStatus = Field(default=DeployStatus.pending)
    deployed_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    log: Optional[str] = None
    triggered_by: Optional[str] = None   # "api", "github_webhook", "auto"
    rollback_of: Optional[int] = None    # FK to previous deployment if this is a rollback

    app: Optional[App] = Relationship(back_populates="deployments")


class DeploymentRead(SQLModel):
    id: int
    app_id: int
    version: str
    image_tag: Optional[str]
    status: DeployStatus
    deployed_at: datetime
    completed_at: Optional[datetime]
    log: Optional[str]
    triggered_by: Optional[str]


# ─────────────────────────── IncidentLog ───────────────────────────

class IncidentLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    app_id: Optional[int] = Field(default=None, foreign_key="app.id")
    agent_id: Optional[int] = Field(default=None, foreign_key="agentdefinition.id")
    level: IncidentLevel = Field(default=IncidentLevel.info)
    category: str = Field(default="system")   # deploy, backup, agent, security
    message: str
    resolved: bool = Field(default=False)
    resolved_at: Optional[datetime] = None

    app: Optional[App] = Relationship(back_populates="incidents")


class IncidentLogRead(SQLModel):
    id: int
    timestamp: datetime
    app_id: Optional[int]
    level: IncidentLevel
    category: str
    message: str
    resolved: bool


# ─────────────────────────── APIToken (Auth) ───────────────────────────

class APIToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    hashed_token: str = Field(index=True)
    role: str = Field(default="viewer")    # admin / operator / viewer
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used_at: Optional[datetime] = None
    revoked: bool = Field(default=False)
