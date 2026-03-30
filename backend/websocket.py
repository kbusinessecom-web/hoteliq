import socketio
from typing import Dict, Set
import logging

logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Track connected users and their rooms
connected_users: Dict[str, str] = {}  # sid -> user_id
user_rooms: Dict[str, Set[str]] = {}  # user_id -> set of conversation_ids

@sio.event
async def connect(sid, environ, auth):
    """Handle client connection"""
    logger.info(f"Client connected: {sid}")
    
    # Get user_id from auth
    user_id = auth.get('user_id') if auth else None
    if user_id:
        connected_users[sid] = user_id
        user_rooms[user_id] = set()
        logger.info(f"User {user_id} connected with sid {sid}")
    
    await sio.emit('connected', {'message': 'Connected to HotelIQ real-time server'}, to=sid)

@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f"Client disconnected: {sid}")
    
    # Clean up user data
    user_id = connected_users.pop(sid, None)
    if user_id:
        user_rooms.pop(user_id, None)
        logger.info(f"User {user_id} disconnected")

@sio.event
async def join_conversation(sid, data):
    """Join a conversation room"""
    conversation_id = data.get('conversation_id')
    user_id = connected_users.get(sid)
    
    if not conversation_id or not user_id:
        return
    
    # Join Socket.IO room
    sio.enter_room(sid, conversation_id)
    
    # Track user's rooms
    if user_id in user_rooms:
        user_rooms[user_id].add(conversation_id)
    
    logger.info(f"User {user_id} joined conversation {conversation_id}")
    await sio.emit('joined_conversation', {'conversation_id': conversation_id}, to=sid)

@sio.event
async def leave_conversation(sid, data):
    """Leave a conversation room"""
    conversation_id = data.get('conversation_id')
    user_id = connected_users.get(sid)
    
    if not conversation_id or not user_id:
        return
    
    # Leave Socket.IO room
    sio.leave_room(sid, conversation_id)
    
    # Remove from user's rooms
    if user_id in user_rooms:
        user_rooms[user_id].discard(conversation_id)
    
    logger.info(f"User {user_id} left conversation {conversation_id}")

@sio.event
async def typing_start(sid, data):
    """Broadcast typing indicator"""
    conversation_id = data.get('conversation_id')
    user_id = connected_users.get(sid)
    user_name = data.get('user_name', 'User')
    
    if not conversation_id or not user_id:
        return
    
    # Broadcast to all in conversation except sender
    await sio.emit(
        'user_typing',
        {'conversation_id': conversation_id, 'user_id': user_id, 'user_name': user_name},
        room=conversation_id,
        skip_sid=sid
    )

@sio.event
async def typing_stop(sid, data):
    """Broadcast typing stop"""
    conversation_id = data.get('conversation_id')
    user_id = connected_users.get(sid)
    
    if not conversation_id or not user_id:
        return
    
    await sio.emit(
        'user_typing_stop',
        {'conversation_id': conversation_id, 'user_id': user_id},
        room=conversation_id,
        skip_sid=sid
    )

# Helper functions to emit events
async def emit_new_message(conversation_id: str, message: dict):
    """Emit new message to all users in conversation"""
    await sio.emit(
        'new_message',
        {'conversation_id': conversation_id, 'message': message},
        room=conversation_id
    )
    logger.info(f"Emitted new message to conversation {conversation_id}")

async def emit_conversation_updated(conversation_id: str, conversation: dict):
    """Emit conversation update to all users in hotel"""
    hotel_id = conversation.get('hotel_id')
    if hotel_id:
        await sio.emit(
            'conversation_updated',
            {'conversation_id': conversation_id, 'conversation': conversation},
            room=hotel_id
        )
        logger.info(f"Emitted conversation update for {conversation_id}")

async def emit_assignment_changed(conversation_id: str, assigned_to: str, assigned_by: str):
    """Emit assignment change notification"""
    await sio.emit(
        'assignment_changed',
        {
            'conversation_id': conversation_id,
            'assigned_to': assigned_to,
            'assigned_by': assigned_by
        },
        room=conversation_id
    )
    logger.info(f"Emitted assignment change for conversation {conversation_id}")

# Create ASGI app
socket_app = socketio.ASGIApp(sio)
