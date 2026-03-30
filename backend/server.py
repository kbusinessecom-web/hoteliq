from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timedelta, timezone
import os
import logging
from typing import List, Optional
import base64

from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

# Import WebSocket
from websocket import sio, socket_app, emit_new_message, emit_conversation_updated, emit_assignment_changed

# Import Document Analysis
from document_service import document_analysis_service

# Import Weekly Report Service
from weekly_report_service import WeeklyReportService

# Import models
from pydantic import BaseModel as PydanticBaseModel
from models import (
    Hotel, HotelCreate, User, UserCreate, UserPublic, UserRole, UserSession,
    Canal, CanalCreate, CanalType, CanalStatus,
    Guest, GuestCreate, Message, MessageCreate, MessageDirection, MessageAuthor, MessageType,
    Conversation, ConversationUpdate, ConversationStatus,
    IATemplate, AnalyticsSnapshot,
    MessageTemplate, MessageTemplateCreate, MessageTemplateUpdate,
    PushToken, ConversationInsight, InsightType, InsightStatus,
    WeeklyReport,
    LoginRequest, LoginResponse, SessionDataRequest,
    AISuggestionRequest, AISuggestionResponse
)
import httpx

# Scheduler (APScheduler)
scheduler = AsyncIOScheduler(timezone="Europe/Paris")

# Import auth utilities
from auth import (
    hash_password, verify_password, create_access_token,
    create_user_session, get_session, delete_session, get_current_user,
    exchange_google_session
)

# Import AI service
from ai_service import ai_service

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Global service instance (initialized on startup)
report_service: Optional[WeeklyReportService] = None

# Create app
app = FastAPI(title="HotelIQ API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# PUSH NOTIFICATIONS
# ============================================================================

async def send_push_notification(push_token: str, title: str, body: str, data: dict = None):
    """Send push notification via Expo Push API"""
    if not push_token or not push_token.startswith('ExponentPushToken'):
        return None
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://exp.host/--/api/v2/push/send',
                json={
                    'to': push_token,
                    'title': title,
                    'body': body,
                    'data': data or {},
                    'sound': 'default',
                },
                timeout=10.0
            )
            return response.json()
    except Exception as e:
        logger.error(f"Push notification error: {e}")
        return None

async def notify_hotel_users(hotel_id: str, title: str, body: str, data: dict = None, exclude_user_id: str = None):
    """Send push notifications to all users of a hotel"""
    try:
        # Get all push tokens for this hotel
        query = {"hotel_id": hotel_id}
        if exclude_user_id:
            query["user_id"] = {"$ne": exclude_user_id}
        
        push_tokens = await db.push_tokens.find(query).to_list(100)
        
        for token_doc in push_tokens:
            await send_push_notification(
                push_token=token_doc['token'],
                title=title,
                body=body,
                data=data
            )
        
        logger.info(f"Sent {len(push_tokens)} push notifications for hotel {hotel_id}")
    except Exception as e:
        logger.error(f"Failed to notify hotel users: {e}")

# ============================================================================
# AUTH ENDPOINTS
# ============================================================================

@api_router.post("/auth/register", response_model=LoginResponse)
async def register(user_data: UserCreate):
    """Register a new user with classic auth"""
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    if not user_data.password:
        raise HTTPException(status_code=400, detail="Password required")
    
    hashed_pwd = hash_password(user_data.password)
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        hashed_password=hashed_pwd
    )
    
    await db.users.insert_one(user.model_dump())
    
    # Create session
    session = await create_user_session(db, user.user_id)
    
    return LoginResponse(
        access_token=session.session_token,
        user=user
    )

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(credentials: LoginRequest, response: Response):
    """Login with email and password"""
    # Find user
    user_doc = await db.users.find_one(
        {"email": credentials.email},
        {"_id": 0}
    )
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = User(**user_doc)
    
    # Verify password
    if not user.hashed_password or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session = await create_user_session(db, user.user_id)
    
    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session.session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,  # 7 days
        path="/"
    )
    
    return LoginResponse(
        access_token=session.session_token,
        user=user
    )

@api_router.post("/auth/google/exchange")
async def google_auth_exchange(session_data: SessionDataRequest, response: Response):
    """
    Exchange Google OAuth session_id for app session.
    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    """
    # Exchange session_id with Emergent Auth
    google_data = await exchange_google_session(session_data.session_id)
    
    # Check if user exists
    user_doc = await db.users.find_one(
        {"email": google_data["email"]},
        {"_id": 0}
    )
    
    if user_doc:
        user = User(**user_doc)
    else:
        # Create new user
        user = User(
            email=google_data["email"],
            name=google_data["name"],
            picture=google_data.get("picture"),
            google_id=google_data["id"],
            role=UserRole.ADMIN  # First user is admin
        )
        await db.users.insert_one(user.model_dump())
    
    # Create session
    session = await create_user_session(db, user.user_id)
    
    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session.session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    
    return {
        "access_token": session.session_token,
        "user": user.model_dump()
    }

@api_router.get("/auth/me", response_model=User)
async def get_me(request: Request):
    """Get current user info"""
    user = await get_current_user(db, request)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout and delete session"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await delete_session(db, session_token)
    
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out successfully"}

# ============================================================================
# HOTEL ENDPOINTS
# ============================================================================

@api_router.post("/hotels", response_model=Hotel)
async def create_hotel(hotel_data: HotelCreate, request: Request):
    """Create a new hotel (onboarding step 1)"""
    user = await get_current_user(db, request)
    
    hotel = Hotel(
        **hotel_data.model_dump(),
        owner_id=user.user_id
    )
    
    await db.hotels.insert_one(hotel.model_dump())
    
    # Update user with hotel_id
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"hotel_id": hotel.hotel_id}}
    )
    
    return hotel

@api_router.get("/hotels/my", response_model=Hotel)
async def get_my_hotel(request: Request):
    """Get current user's hotel"""
    user = await get_current_user(db, request)
    
    if not user.hotel_id:
        raise HTTPException(status_code=404, detail="No hotel found")
    
    hotel_doc = await db.hotels.find_one(
        {"hotel_id": user.hotel_id},
        {"_id": 0}
    )
    
    if not hotel_doc:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    return Hotel(**hotel_doc)

# ============================================================================
# CANAL ENDPOINTS
# ============================================================================

@api_router.post("/canals", response_model=Canal)
async def create_canal(canal_data: CanalCreate, request: Request):
    """Connect a new communication canal (onboarding step 2)"""
    user = await get_current_user(db, request)
    
    if not user.hotel_id:
        raise HTTPException(status_code=400, detail="User must have a hotel")
    
    canal = Canal(
        hotel_id=user.hotel_id,
        **canal_data.model_dump(),
        status=CanalStatus.CONNECTED  # Mock connected for demo
    )
    
    await db.canals.insert_one(canal.model_dump())
    return canal

@api_router.get("/canals", response_model=List[Canal])
async def get_canals(request: Request):
    """Get all canals for user's hotel"""
    user = await get_current_user(db, request)
    
    if not user.hotel_id:
        return []
    
    canals = await db.canals.find(
        {"hotel_id": user.hotel_id},
        {"_id": 0}
    ).to_list(100)
    
    return [Canal(**c) for c in canals]

# ============================================================================
# CONVERSATION & MESSAGE ENDPOINTS
# ============================================================================

@api_router.get("/conversations", response_model=List[Conversation])
async def get_conversations(
    request: Request,
    status: Optional[ConversationStatus] = None,
    canal_type: Optional[CanalType] = None,
    assigned_to_me: bool = False
):
    """Get conversations with filters"""
    user = await get_current_user(db, request)
    
    if not user.hotel_id:
        return []
    
    # Build query
    query = {"hotel_id": user.hotel_id}
    if status:
        query["status"] = status
    if canal_type:
        query["canal_type"] = canal_type
    if assigned_to_me:
        query["assigned_to"] = user.user_id
    
    conversations = await db.conversations.find(
        query,
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(100)
    
    return [Conversation(**c) for c in conversations]

@api_router.get("/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str, request: Request):
    """Get conversation details"""
    user = await get_current_user(db, request)
    
    conv_doc = await db.conversations.find_one(
        {"conversation_id": conversation_id, "hotel_id": user.hotel_id},
        {"_id": 0}
    )
    
    if not conv_doc:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return Conversation(**conv_doc)

@api_router.patch("/conversations/{conversation_id}", response_model=Conversation)
async def update_conversation(
    conversation_id: str,
    update_data: ConversationUpdate,
    request: Request
):
    """Update conversation status, assignment, tags"""
    user = await get_current_user(db, request)
    
    # Prepare update
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.conversations.update_one(
        {"conversation_id": conversation_id, "hotel_id": user.hotel_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Return updated conversation
    conv_doc = await db.conversations.find_one(
        {"conversation_id": conversation_id},
        {"_id": 0}
    )
    
    # Emit real-time event
    await emit_conversation_updated(conversation_id, conv_doc)
    
    # Emit assignment change if applicable
    if 'assigned_to' in update_dict:
        await emit_assignment_changed(conversation_id, update_dict['assigned_to'], user.user_id)
    
    return Conversation(**conv_doc)

@api_router.get("/conversations/{conversation_id}/messages", response_model=List[Message])
async def get_messages(conversation_id: str, request: Request):
    """Get all messages in a conversation"""
    user = await get_current_user(db, request)
    
    # Verify conversation access
    conv = await db.conversations.find_one(
        {"conversation_id": conversation_id, "hotel_id": user.hotel_id}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = await db.messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)
    
    return [Message(**m) for m in messages]

@api_router.post("/conversations/{conversation_id}/messages", response_model=Message)
async def send_message(
    conversation_id: str,
    message_data: MessageCreate,
    request: Request
):
    """Send a message or internal note in a conversation"""
    user = await get_current_user(db, request)
    
    # Verify conversation
    conv = await db.conversations.find_one(
        {"conversation_id": conversation_id, "hotel_id": user.hotel_id}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Create message
    message = Message(
        conversation_id=conversation_id,
        content=message_data.content,
        direction=message_data.direction,
        author=message_data.author,
        author_user_id=user.user_id if message_data.author == MessageAuthor.USER else None,
        author_name=user.name,
        message_type=message_data.message_type,
        mentions=message_data.mentions,
    )
    
    await db.messages.insert_one(message.model_dump())
    
    # Only update conversation last_message if it's a normal message (not internal note)
    if message_data.message_type == MessageType.NORMAL:
        await db.conversations.update_one(
            {"conversation_id": conversation_id},
            {
                "$set": {
                    "last_message": message.content[:100],
                    "last_message_at": message.timestamp,
                    "status": ConversationStatus.IN_PROGRESS
                }
            }
        )
    
    # Emit real-time event
    await emit_new_message(conversation_id, message.model_dump())
    
    # Send push notifications for mentions in internal notes
    if message_data.mentions and message_data.message_type == MessageType.INTERNAL_NOTE:
        for mentioned_user_id in message_data.mentions:
            push_token_doc = await db.push_tokens.find_one(
                {"user_id": mentioned_user_id},
                sort=[("created_at", -1)]
            )
            if push_token_doc:
                await send_push_notification(
                    push_token=push_token_doc['token'],
                    title=f"🔔 Mention de {user.name}",
                    body=message.content[:100],
                    data={"conversation_id": conversation_id, "type": "mention"}
                )
    
    return message

# ============================================================================
# AI ENDPOINTS
# ============================================================================

@api_router.post("/ai/suggest", response_model=AISuggestionResponse)
async def get_ai_suggestion(
    suggestion_request: AISuggestionRequest,
    request: Request
):
    """Get AI-powered response suggestion"""
    user = await get_current_user(db, request)
    
    # Get conversation
    conv = await db.conversations.find_one(
        {"conversation_id": suggestion_request.conversation_id, "hotel_id": user.hotel_id}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get guest info
    guest = await db.guests.find_one({"guest_id": conv["guest_id"]}, {"_id": 0})
    
    # Get hotel info + brand profile
    hotel = await db.hotels.find_one({"hotel_id": user.hotel_id}, {"_id": 0})
    brand_profile = hotel.get('brand_profile') if hotel else None
    
    # Get conversation history
    messages = await db.messages.find(
        {"conversation_id": suggestion_request.conversation_id},
        {"_id": 0}
    ).sort("timestamp", 1).limit(10).to_list(10)
    
    # Generate AI suggestion with brand profile
    result = await ai_service.generate_response_suggestion(
        guest_message=suggestion_request.guest_message,
        guest_name=guest["name"] if guest else "Client",
        hotel_name=hotel["name"] if hotel else "Hôtel",
        conversation_history=messages,
        language=suggestion_request.guest_language,
        brand_profile=brand_profile
    )
    
    return AISuggestionResponse(**result)

# ============================================================================
# WEBHOOK SIMULATOR (For demo - simulates incoming messages)
# ============================================================================

class SimulatedIncomingMessage(PydanticBaseModel):
    conversation_id: str
    content: str

@api_router.post("/webhook/simulate-incoming")
async def simulate_incoming_message(data: SimulatedIncomingMessage, request: Request):
    """
    Simulate an incoming message from a guest.
    This endpoint is for demo/testing purposes.
    In production, this would be replaced by actual WhatsApp/Instagram webhooks.
    """
    user = await get_current_user(db, request)
    
    # Verify conversation belongs to user's hotel
    conv = await db.conversations.find_one(
        {"conversation_id": data.conversation_id, "hotel_id": user.hotel_id}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get guest info
    guest = await db.guests.find_one({"guest_id": conv["guest_id"]})
    guest_name = guest["name"] if guest else "Client"
    
    # Create the incoming message
    message = Message(
        conversation_id=data.conversation_id,
        content=data.content,
        direction=MessageDirection.INBOUND,
        author=MessageAuthor.GUEST,
        message_type=MessageType.NORMAL,
    )
    
    await db.messages.insert_one(message.model_dump())
    
    # Update conversation
    await db.conversations.update_one(
        {"conversation_id": data.conversation_id},
        {
            "$set": {
                "last_message": message.content[:100],
                "last_message_at": message.timestamp,
                "status": ConversationStatus.NEW if conv.get("status") == "resolved" else conv.get("status")
            }
        }
    )
    
    # Emit real-time event
    await emit_new_message(data.conversation_id, message.model_dump())
    
    # Send push notifications to all hotel users
    await notify_hotel_users(
        hotel_id=user.hotel_id,
        title=f"💬 Nouveau message de {guest_name}",
        body=data.content[:100],
        data={
            "conversation_id": data.conversation_id,
            "type": "new_message",
            "guest_name": guest_name
        }
    )
    
    logger.info(f"Simulated incoming message in conversation {data.conversation_id}")
    
    return {"status": "success", "message": message.model_dump()}

# ============================================================================
# GUEST ENDPOINTS
# ============================================================================

@api_router.get("/guests", response_model=List[Guest])
async def get_guests(request: Request):
    """Get all guests for hotel"""
    user = await get_current_user(db, request)
    
    if not user.hotel_id:
        return []
    
    guests = await db.guests.find(
        {"hotel_id": user.hotel_id},
        {"_id": 0}
    ).to_list(100)
    
    return [Guest(**g) for g in guests]

@api_router.get("/guests/{guest_id}", response_model=Guest)
async def get_guest(guest_id: str, request: Request):
    """Get guest details"""
    user = await get_current_user(db, request)
    
    guest_doc = await db.guests.find_one(
        {"guest_id": guest_id, "hotel_id": user.hotel_id},
        {"_id": 0}
    )
    
    if not guest_doc:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    return Guest(**guest_doc)

# ============================================================================
# ANALYTICS ENDPOINTS
# ============================================================================

@api_router.get("/analytics/dashboard", response_model=AnalyticsSnapshot)
async def get_dashboard_analytics(request: Request):
    """Get current analytics snapshot"""
    user = await get_current_user(db, request)
    
    if not user.hotel_id:
        raise HTTPException(status_code=404, detail="No hotel found")
    
    # Get latest snapshot or create one
    snapshot = await db.analytics_snapshots.find_one(
        {"hotel_id": user.hotel_id},
        {"_id": 0},
        sort=[("date", -1)]
    )
    
    if snapshot:
        return AnalyticsSnapshot(**snapshot)
    
    # Return empty snapshot if none exists
    return AnalyticsSnapshot(hotel_id=user.hotel_id)

# ============================================================================
# DOCUMENT UPLOAD & ANALYSIS ENDPOINTS
# ============================================================================

@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    request: Request = None
):
    """Upload and analyze hotel document (PDF, DOCX, TXT)"""
    user = await get_current_user(db, request)
    
    if not user.hotel_id:
        raise HTTPException(status_code=400, detail="User must have a hotel")
    
    # Validate file type
    allowed_extensions = ['pdf', 'docx', 'doc', 'txt']
    file_extension = file.filename.split('.')[-1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier non supporté. Formats acceptés: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size (max 10MB)
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10MB)")
    
    try:
        # Extract text from document
        extracted_text = document_analysis_service.extract_text(file_content, file.filename)
        
        if not extracted_text or len(extracted_text) < 50:
            raise HTTPException(status_code=400, detail="Le document ne contient pas assez de texte")
        
        # Get hotel info
        hotel_doc = await db.hotels.find_one({"hotel_id": user.hotel_id}, {"_id": 0})
        if not hotel_doc:
            raise HTTPException(status_code=404, detail="Hotel not found")
        
        hotel_name = hotel_doc.get('name', 'Hotel')
        
        # Analyze brand voice
        brand_profile = await document_analysis_service.analyze_brand_voice(extracted_text, hotel_name)
        
        # Store document and analysis in hotel
        document_data = {
            "filename": file.filename,
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "file_size": len(file_content),
            "text_length": len(extracted_text),
            "brand_profile": brand_profile
        }
        
        # Update hotel with brand profile
        await db.hotels.update_one(
            {"hotel_id": user.hotel_id},
            {
                "$set": {"brand_profile": brand_profile},
                "$push": {"training_documents": document_data}
            }
        )
        
        return {
            "message": "Document analysé avec succès",
            "filename": file.filename,
            "text_length": len(extracted_text),
            "brand_profile": brand_profile
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Document upload error: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'analyse du document")

@api_router.get("/hotels/brand-profile")
async def get_brand_profile(request: Request):
    """Get hotel's brand profile from analyzed documents"""
    user = await get_current_user(db, request)
    
    if not user.hotel_id:
        raise HTTPException(status_code=404, detail="No hotel found")
    
    hotel_doc = await db.hotels.find_one(
        {"hotel_id": user.hotel_id},
        {"_id": 0, "brand_profile": 1, "training_documents": 1}
    )
    
    if not hotel_doc:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    return {
        "brand_profile": hotel_doc.get('brand_profile'),
        "documents_count": len(hotel_doc.get('training_documents', []))
    }

# ============================================================================
# MESSAGE TEMPLATES ENDPOINTS
# ============================================================================

@api_router.get("/templates", response_model=List[MessageTemplate])
async def get_templates(request: Request, category: Optional[str] = None):
    """Get all message templates for hotel"""
    user = await get_current_user(db, request)
    
    if not user.hotel_id:
        return []
    
    # Build query
    query = {"hotel_id": user.hotel_id}
    if category:
        query["category"] = category
    
    templates = await db.message_templates.find(
        query,
        {"_id": 0}
    ).sort("category", 1).sort("usage_count", -1).to_list(100)
    
    return [MessageTemplate(**t) for t in templates]

@api_router.post("/templates", response_model=MessageTemplate)
async def create_template(template_data: MessageTemplateCreate, request: Request):
    """Create a new message template"""
    user = await get_current_user(db, request)
    
    if not user.hotel_id:
        raise HTTPException(status_code=400, detail="User must have a hotel")
    
    template = MessageTemplate(
        hotel_id=user.hotel_id,
        **template_data.model_dump(),
        created_by=user.user_id
    )
    
    await db.message_templates.insert_one(template.model_dump())
    return template

@api_router.patch("/templates/{template_id}", response_model=MessageTemplate)
async def update_template(
    template_id: str,
    update_data: MessageTemplateUpdate,
    request: Request
):
    """Update a message template"""
    user = await get_current_user(db, request)
    
    # Prepare update
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.message_templates.update_one(
        {"template_id": template_id, "hotel_id": user.hotel_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Return updated template
    template_doc = await db.message_templates.find_one(
        {"template_id": template_id},
        {"_id": 0}
    )
    return MessageTemplate(**template_doc)

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str, request: Request):
    """Delete a message template"""
    user = await get_current_user(db, request)
    
    result = await db.message_templates.delete_one(
        {"template_id": template_id, "hotel_id": user.hotel_id, "is_default": False}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found or cannot delete default template")
    
    return {"message": "Template deleted successfully"}

@api_router.post("/templates/{template_id}/use")
async def use_template(template_id: str, request: Request):
    """Increment usage count when template is used"""
    user = await get_current_user(db, request)
    
    result = await db.message_templates.update_one(
        {"template_id": template_id, "hotel_id": user.hotel_id},
        {"$inc": {"usage_count": 1}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Usage count incremented"}

# ============================================================================
# AI INSIGHTS ENDPOINTS
# ============================================================================

@api_router.post("/ai/analyze/{conversation_id}")
async def analyze_conversation(conversation_id: str, request: Request):
    """Analyze a conversation and generate AI insights"""
    user = await get_current_user(db, request)
    
    # Verify conversation
    conv = await db.conversations.find_one(
        {"conversation_id": conversation_id, "hotel_id": user.hotel_id},
        {"_id": 0}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Get messages
    messages = await db.messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(50)
    
    # Get guest info
    guest_doc = await db.guests.find_one({"guest_id": conv.get("guest_id")}, {"_id": 0})
    guest_name = guest_doc.get("name", "Client") if guest_doc else "Client"
    
    # Get hotel info
    hotel_doc = await db.hotels.find_one({"hotel_id": user.hotel_id}, {"_id": 0})
    hotel_name = hotel_doc.get("name", "Hôtel") if hotel_doc else "Hôtel"
    hotel_context = hotel_doc.get("brand_profile") if hotel_doc else None
    
    # Delete old pending insights for this conversation to avoid duplicates
    await db.conversation_insights.delete_many({
        "conversation_id": conversation_id,
        "status": InsightStatus.PENDING
    })
    
    # Generate insights via AI
    raw_insights = await ai_service.analyze_conversation_for_insights(
        conversation_id=conversation_id,
        messages=[dict(m) for m in messages],
        guest_name=guest_name,
        hotel_name=hotel_name,
        hotel_context=hotel_context
    )
    
    # Store insights
    stored_insights = []
    for raw in raw_insights:
        insight = ConversationInsight(
            conversation_id=conversation_id,
            hotel_id=user.hotel_id,
            guest_id=conv.get("guest_id", ""),
            guest_name=guest_name,
            insight_type=InsightType(raw["type"]),
            title=raw["title"],
            description=raw["description"],
            suggested_message=raw["suggested_message"],
            confidence_score=raw["confidence"],
            potential_revenue=raw["potential_revenue"],
        )
        await db.conversation_insights.insert_one(insight.model_dump())
        stored_insights.append(insight)
    
    return {
        "conversation_id": conversation_id,
        "insights_count": len(stored_insights),
        "insights": [i.model_dump() for i in stored_insights]
    }

@api_router.get("/ai/insights")
async def get_hotel_insights(request: Request, status: Optional[str] = None, conversation_id: Optional[str] = None):
    """Get all AI insights for hotel (for dashboard)"""
    user = await get_current_user(db, request)
    
    query: dict = {"hotel_id": user.hotel_id}
    if status:
        query["status"] = status
    if conversation_id:
        query["conversation_id"] = conversation_id
    
    insights = await db.conversation_insights.find(
        query, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    insights_list = [ConversationInsight(**i).model_dump() for i in insights]
    
    # Compute summary stats
    pending = [i for i in insights_list if i["status"] == InsightStatus.PENDING]
    total_revenue = sum(i["potential_revenue"] for i in pending if i["insight_type"] == InsightType.UPSELL)
    by_type = {
        InsightType.UPSELL: len([i for i in pending if i["insight_type"] == InsightType.UPSELL]),
        InsightType.LOYALTY: len([i for i in pending if i["insight_type"] == InsightType.LOYALTY]),
        InsightType.REVIEW: len([i for i in pending if i["insight_type"] == InsightType.REVIEW]),
    }
    
    return {
        "total": len(insights_list),
        "pending": len(pending),
        "total_potential_revenue": total_revenue,
        "by_type": by_type,
        "insights": insights_list
    }

@api_router.patch("/ai/insights/{insight_id}")
async def update_insight_status(insight_id: str, request: Request):
    """Update insight status (sent/dismissed)"""
    user = await get_current_user(db, request)
    
    body = await request.json()
    new_status = body.get("status")
    
    if new_status not in (InsightStatus.SENT, InsightStatus.DISMISSED):
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.conversation_insights.update_one(
        {"insight_id": insight_id, "hotel_id": user.hotel_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Insight not found")
    
    return {"message": f"Insight marked as {new_status}"}

@api_router.post("/ai/analyze-all")
async def analyze_all_conversations(request: Request):
    """Analyze all recent conversations for the hotel (batch)"""
    user = await get_current_user(db, request)
    
    # Get hotel info
    hotel_doc = await db.hotels.find_one({"hotel_id": user.hotel_id}, {"_id": 0})
    hotel_name = hotel_doc.get("name", "Hôtel") if hotel_doc else "Hôtel"
    hotel_context = hotel_doc.get("brand_profile") if hotel_doc else None
    
    # Get recent in-progress conversations
    conversations = await db.conversations.find(
        {"hotel_id": user.hotel_id, "status": {"$in": ["in_progress", "new"]}},
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(10)
    
    total_new_insights = 0
    
    for conv in conversations:
        conv_id = conv.get("conversation_id")
        
        # Get messages
        messages = await db.messages.find(
            {"conversation_id": conv_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(30)
        
        if len(messages) < 2:
            continue
        
        # Get guest info
        guest_doc = await db.guests.find_one({"guest_id": conv.get("guest_id")}, {"_id": 0})
        guest_name = guest_doc.get("name", "Client") if guest_doc else "Client"
        
        # Delete old pending insights to refresh
        await db.conversation_insights.delete_many({
            "conversation_id": conv_id,
            "status": InsightStatus.PENDING
        })
        
        # Generate
        raw_insights = await ai_service.analyze_conversation_for_insights(
            conversation_id=conv_id,
            messages=[dict(m) for m in messages],
            guest_name=guest_name,
            hotel_name=hotel_name,
            hotel_context=hotel_context
        )
        
        for raw in raw_insights:
            insight = ConversationInsight(
                conversation_id=conv_id,
                hotel_id=user.hotel_id,
                guest_id=conv.get("guest_id", ""),
                guest_name=guest_name,
                insight_type=InsightType(raw["type"]),
                title=raw["title"],
                description=raw["description"],
                suggested_message=raw["suggested_message"],
                confidence_score=raw["confidence"],
                potential_revenue=raw["potential_revenue"],
            )
            await db.conversation_insights.insert_one(insight.model_dump())
            total_new_insights += 1
    
    return {
        "conversations_analyzed": len(conversations),
        "new_insights": total_new_insights
    }

# ============================================================================
# HEALTH CHECK
# ============================================================================

@api_router.get("/users", response_model=List[UserPublic])
async def get_team_members(request: Request):
    """Get all team members in the same hotel"""
    user = await get_current_user(db, request)
    
    if not user.hotel_id:
        return []
    
    users = await db.users.find(
        {"hotel_id": user.hotel_id},
        {"_id": 0, "hashed_password": 0, "google_id": 0}
    ).to_list(100)
    
    return [UserPublic(**u) for u in users]

@api_router.post("/push-tokens")
async def register_push_token(request: Request):
    """Register device push token for notifications"""
    user = await get_current_user(db, request)
    
    body = await request.json()
    token = body.get('token')
    device_type = body.get('device_type', 'unknown')
    
    if not token:
        raise HTTPException(status_code=400, detail="Token required")
    
    push_token = PushToken(
        user_id=user.user_id,
        hotel_id=user.hotel_id or '',
        token=token,
        device_type=device_type
    )
    
    await db.push_tokens.update_one(
        {"user_id": user.user_id, "token": token},
        {"$set": push_token.model_dump()},
        upsert=True
    )
    
    return {"message": "Push token registered"}

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ============================================================================
# WEEKLY REPORTS ENDPOINTS
# ============================================================================

@api_router.post("/reports/send")
async def send_weekly_report(request: Request):
    """Manually trigger weekly report for the current hotel"""
    user = await get_current_user(db, request)

    result = await report_service.send_report_for_hotel(user.hotel_id)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send report"))
    return result

@api_router.get("/reports")
async def get_reports(request: Request):
    """Get list of past weekly reports for this hotel"""
    user = await get_current_user(db, request)

    reports = await db.weekly_reports.find(
        {"hotel_id": user.hotel_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    return [WeeklyReport(**r).model_dump() for r in reports]

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize scheduler for weekly reports (every Monday at 8am Paris time)"""
    global report_service
    report_service = WeeklyReportService(db)

    async def send_all_weekly_reports_job():
        logger.info("⏰ Sending weekly reports to all hotels...")
        results = await report_service.send_all_reports()
        logger.info(f"Weekly reports sent: {results}")

    scheduler.add_job(
        send_all_weekly_reports_job,
        CronTrigger(day_of_week='mon', hour=8, minute=0, timezone='Europe/Paris'),
        id='weekly_reports',
        replace_existing=True,
    )
    scheduler.start()
    logger.info("✅ APScheduler started — Weekly reports scheduled every Monday at 8am")

@app.on_event("shutdown")
async def shutdown_db_client():
    if scheduler.running:
        scheduler.shutdown()
    client.close()

# Mount Socket.IO
app.mount("/socket.io", socket_app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
