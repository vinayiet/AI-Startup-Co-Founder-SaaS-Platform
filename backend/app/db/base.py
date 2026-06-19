import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Boolean, DateTime, Integer, ForeignKey, JSON, Float, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="member", nullable=False)  # owner, member, viewer
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    workspaces: Mapped[List["Workspace"]] = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan")
    api_keys: Mapped[List["APIKey"]] = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    subscription: Mapped[Optional["Subscription"]] = relationship("Subscription", back_populates="user", uselist=False, cascade="all, delete-orphan")
    chat_sessions: Mapped[List["ChatSession"]] = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    copilot_analytics: Mapped[List["CopilotAnalytics"]] = relationship("CopilotAnalytics", back_populates="user", cascade="all, delete-orphan")


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    max_workspaces: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    max_projects: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    max_agent_runs_per_month: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    api_access: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    subscriptions: Mapped[List["Subscription"]] = relationship("Subscription", back_populates="plan")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("subscription_plans.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)  # active, cancelled, expired
    current_period_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="subscription")
    plan: Mapped["SubscriptionPlan"] = relationship("SubscriptionPlan", back_populates="subscriptions")


class Workspace(Base, TimestampMixin):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="workspaces")
    projects: Mapped[List["Project"]] = relationship("Project", back_populates="workspace", cascade="all, delete-orphan")


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)  # Startup idea
    industry: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    target_audience: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="projects")
    reports: Mapped[List["Report"]] = relationship("Report", back_populates="project", cascade="all, delete-orphan")
    workflow_runs: Mapped[List["WorkflowRun"]] = relationship("WorkflowRun", back_populates="project", cascade="all, delete-orphan")
    chat_sessions: Mapped[List["ChatSession"]] = relationship("ChatSession", back_populates="project", cascade="all, delete-orphan")
    copilot_analytics: Mapped[List["CopilotAnalytics"]] = relationship("CopilotAnalytics", back_populates="project", cascade="all, delete-orphan")
    board_meetings: Mapped[List["BoardMeeting"]] = relationship("BoardMeeting", back_populates="project", cascade="all, delete-orphan")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    sections: Mapped[dict] = mapped_column(JSONB, nullable=False)  # Pitch deck, financials, etc.
    version: Mapped[str] = mapped_column(String(50), default="1.0.0", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    project: Mapped["Project"] = relationship("Project", back_populates="reports")


class WorkflowRun(Base, TimestampMixin):
    __tablename__ = "workflow_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # pending, running, waiting_approval, completed, failed
    state_snapshot: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    current_step: Mapped[str] = mapped_column(String(100), default="Idea Analyzer", nullable=False)
    logs: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    project: Mapped["Project"] = relationship("Project", back_populates="workflow_runs")


class APIKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    prefix: Mapped[str] = mapped_column(String(16), nullable=False)
    scopes: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="api_keys")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    details: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")


class ChatSession(Base, TimestampMixin):
    __tablename__ = "chat_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="chat_sessions")
    user: Mapped["User"] = relationship("User", back_populates="chat_sessions")
    messages: Mapped[List["ChatMessage"]] = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # user, assistant
    content: Mapped[str] = mapped_column(String, nullable=False)
    citations: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # List of chunks used
    suggestions: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # List of dynamic follow-up questions
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    session: Mapped["ChatSession"] = relationship("ChatSession", back_populates="messages")


class CopilotAnalytics(Base):
    __tablename__ = "copilot_analytics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)  # chat_start, question_asked, slash_command_executed
    payload: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="copilot_analytics")
    user: Mapped["User"] = relationship("User", back_populates="copilot_analytics")


class BoardMeeting(Base, TimestampMixin):
    __tablename__ = "board_meetings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    topic: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # pending, running, completed, failed
    final_decision: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Approved, Approved with Caution, Rejected
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    action_items: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # list of strings

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="board_meetings")
    rounds: Mapped[List["BoardDebateRound"]] = relationship("BoardDebateRound", back_populates="meeting", cascade="all, delete-orphan")
    votes: Mapped[List["BoardVote"]] = relationship("BoardVote", back_populates="meeting", cascade="all, delete-orphan")


class BoardDebateRound(Base):
    __tablename__ = "board_debate_rounds"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("board_meetings.id", ondelete="CASCADE"), nullable=False)
    agent_name: Mapped[str] = mapped_column(String(100), nullable=False)
    round_number: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    stance: Mapped[str] = mapped_column(String(50), nullable=False)  # supportive, skeptical, neutral
    agreements: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # list of agent names
    disagreements: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # list of agent names
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    meeting: Mapped["BoardMeeting"] = relationship("BoardMeeting", back_populates="rounds")


class BoardVote(Base):
    __tablename__ = "board_votes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("board_meetings.id", ondelete="CASCADE"), nullable=False)
    agent_name: Mapped[str] = mapped_column(String(100), nullable=False)
    vote: Mapped[str] = mapped_column(String(50), nullable=False)  # Approve, Approve with Caution, Reject
    confidence: Mapped[float] = mapped_column(Float, nullable=False)  # 0.0 - 1.0
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    meeting: Mapped["BoardMeeting"] = relationship("BoardMeeting", back_populates="votes")

