from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timedelta, timezone
import os
import logging
from typing import List, Optional

# Import WebSocket
from websocket import sio, socket_app, emit_new_message, emit_conversation_updated, emit_assignment_changed

# Import models
from models import (
    Hotel, HotelCreate, User, UserCreate, UserRole, UserSession,
    Canal, CanalCreate, CanalType, CanalStatus,
    Guest, GuestCreate, Message, MessageCreate, MessageDirection, MessageAuthor,
    Conversation, ConversationUpdate, ConversationStatus,
    IATemplate, AnalyticsSnapshot,
    LoginRequest, LoginResponse, SessionDataRequest,
    AISuggestionRequest, AISuggestionResponse
)

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
    """Send a message in a conversation"""
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
        author_user_id=user.user_id if message_data.author == MessageAuthor.USER else None
    )
    
    await db.messages.insert_one(message.model_dump())
    
    # Update conversation
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
    
    # Get hotel info
    hotel = await db.hotels.find_one({"hotel_id": user.hotel_id}, {"_id": 0})
    
    # Get conversation history
    messages = await db.messages.find(
        {"conversation_id": suggestion_request.conversation_id},
        {"_id": 0}
    ).sort("timestamp", 1).limit(10).to_list(10)
    
    # Generate AI suggestion
    result = await ai_service.generate_response_suggestion(
        guest_message=suggestion_request.guest_message,
        guest_name=guest["name"] if guest else "Client",
        hotel_name=hotel["name"] if hotel else "Hôtel",
        conversation_history=messages,
        language=suggestion_request.guest_language
    )
    
    return AISuggestionResponse(**result)

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
# HEALTH CHECK
# ============================================================================

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Mount Socket.IO
app.mount("/socket.io", socket_app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
