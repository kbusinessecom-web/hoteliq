from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    RECEPTIONIST = "receptionist"

class ConversationStatus(str, Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    WAITING = "waiting"
    RESOLVED = "resolved"
    ARCHIVED = "archived"

class CanalType(str, Enum):
    WHATSAPP = "whatsapp"
    INSTAGRAM = "instagram"
    EMAIL = "email"
    WEB = "web"

class CanalStatus(str, Enum):
    IDLE = "idle"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"

class MessageDirection(str, Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"

class MessageAuthor(str, Enum):
    GUEST = "guest"
    USER = "user"
    AI = "ai"

class SubscriptionPlan(str, Enum):
    ESSENTIAL = "essential"
    PRO = "pro"
    ENTERPRISE = "enterprise"

# Base Models
class Hotel(BaseModel):
    hotel_id: str = Field(default_factory=lambda: f"hotel_{uuid.uuid4().hex[:12]}")
    name: str
    city: str
    nb_chambres: int = Field(alias="room_count")
    classification: str  # "4★" or "5★"
    season_type: str  # "Annuel" or "Saisonnier"
    language: str = "fr"  # Primary language
    subscription_plan: SubscriptionPlan = SubscriptionPlan.ESSENTIAL
    created_at: datetime = Field(default_factory=datetime.utcnow)
    owner_id: str  # User ID of the hotel owner
    
    class Config:
        populate_by_name = True

class HotelCreate(BaseModel):
    name: str
    city: str
    room_count: int
    classification: str
    season_type: str
    language: str = "fr"

class User(BaseModel):
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: EmailStr
    name: str
    picture: Optional[str] = None
    role: UserRole = UserRole.RECEPTIONIST
    hotel_id: Optional[str] = None
    notification_preferences: Dict[str, bool] = Field(default_factory=lambda: {"email": True, "push": True})
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # For classic auth
    hashed_password: Optional[str] = None
    # For Google OAuth
    google_id: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: Optional[str] = None  # For classic auth
    role: UserRole = UserRole.RECEPTIONIST

class UserSession(BaseModel):
    session_id: str = Field(default_factory=lambda: f"session_{uuid.uuid4().hex}")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Canal(BaseModel):
    canal_id: str = Field(default_factory=lambda: f"canal_{uuid.uuid4().hex[:12]}")
    hotel_id: str
    type: CanalType
    status: CanalStatus = CanalStatus.IDLE
    credentials: Optional[Dict[str, Any]] = None  # Encrypted credentials
    webhook_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_sync: Optional[datetime] = None

class CanalCreate(BaseModel):
    type: CanalType
    credentials: Optional[Dict[str, Any]] = None

class Guest(BaseModel):
    guest_id: str = Field(default_factory=lambda: f"guest_{uuid.uuid4().hex[:12]}")
    hotel_id: str
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    language: str = "fr"
    channels_used: List[CanalType] = Field(default_factory=list)
    nb_stays: int = 0
    estimated_client_value: float = 0.0
    tags: List[str] = Field(default_factory=list)  # ["VIP", "Group", "Complaint"]
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class GuestCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    language: str = "fr"

class Message(BaseModel):
    message_id: str = Field(default_factory=lambda: f"msg_{uuid.uuid4().hex[:12]}")
    conversation_id: str
    direction: MessageDirection
    content: str
    author: MessageAuthor
    author_user_id: Optional[str] = None  # If sent by a user
    ia_confidence_score: Optional[float] = None  # 0-1 for AI suggestions
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    read: bool = False

class MessageCreate(BaseModel):
    content: str
    direction: MessageDirection = MessageDirection.OUTBOUND
    author: MessageAuthor = MessageAuthor.USER

class Conversation(BaseModel):
    conversation_id: str = Field(default_factory=lambda: f"conv_{uuid.uuid4().hex[:12]}")
    hotel_id: str
    guest_id: str
    canal_id: str
    canal_type: CanalType  # For quick filtering
    status: ConversationStatus = ConversationStatus.NEW
    priority: int = 0  # 0-10, AI-calculated
    detected_subject: Optional[str] = None  # "Reservation", "Question", "Complaint"
    assigned_to: Optional[str] = None  # user_id
    last_message: Optional[str] = None  # Preview
    last_message_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = Field(default_factory=list)

class ConversationUpdate(BaseModel):
    status: Optional[ConversationStatus] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None

class IATemplate(BaseModel):
    template_id: str = Field(default_factory=lambda: f"tpl_{uuid.uuid4().hex[:12]}")
    hotel_id: str
    name: str
    trigger: str  # Keywords that trigger this template
    content_fr: str
    content_en: Optional[str] = None
    content_de: Optional[str] = None
    nb_utilisations: int = 0
    approval_rate: float = 0.0  # 0-1
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AnalyticsSnapshot(BaseModel):
    snapshot_id: str = Field(default_factory=lambda: f"snap_{uuid.uuid4().hex[:12]}")
    hotel_id: str
    date: datetime = Field(default_factory=datetime.utcnow)
    total_conversations: int = 0
    response_rate_5min: float = 0.0  # Percentage
    confirmed_reservations: int = 0
    estimated_captured_revenue: float = 0.0
    estimated_lost_revenue: float = 0.0

class MessageTemplate(BaseModel):
    template_id: str = Field(default_factory=lambda: f"tpl_{uuid.uuid4().hex[:12]}")
    hotel_id: str
    name: str
    category: str  # "welcome", "confirmation", "info", "urgency", "follow_up", "upsell"
    content: str  # Template with {{variables}}
    language: str = "fr"
    is_default: bool = False  # System templates
    usage_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str  # user_id

class MessageTemplateCreate(BaseModel):
    name: str
    category: str
    content: str
    language: str = "fr"

class MessageTemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None

# Auth Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class SessionDataRequest(BaseModel):
    session_id: str

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

# AI Models
class AISuggestionRequest(BaseModel):
    conversation_id: str
    guest_message: str
    guest_language: str = "fr"

class AISuggestionResponse(BaseModel):
    suggestion: str
    confidence_score: float  # 0-1
    language: str
