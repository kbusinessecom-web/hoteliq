"""
Script to seed the database with mock data for HotelIQ
Run with: python seed_data.py
"""
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from pathlib import Path
import asyncio
import os
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from models import (
    Hotel, User, UserRole, Canal, CanalType, CanalStatus,
    Guest, Conversation, ConversationStatus, Message, MessageDirection, MessageAuthor,
    AnalyticsSnapshot, SubscriptionPlan
)
from auth import hash_password

load_dotenv()

async def seed_database():
    """Seed database with mock data"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🌱 Starting database seeding...")
    
    # Clear existing data
    print("Clearing existing data...")
    await db.hotels.delete_many({})
    await db.users.delete_many({})
    await db.canals.delete_many({})
    await db.guests.delete_many({})
    await db.conversations.delete_many({})
    await db.messages.delete_many({})
    await db.analytics_snapshots.delete_many({})
    await db.user_sessions.delete_many({})
    
    # Create demo hotel
    print("Creating demo hotel...")
    hotel = Hotel(
        name="Le Riviera Palace",
        city="Cannes",
        nb_chambres=45,
        classification="5★",
        season_type="Saisonnier",
        language="fr",
        subscription_plan=SubscriptionPlan.PRO,
        owner_id="user_demo_owner"
    )
    await db.hotels.insert_one(hotel.model_dump())
    
    # Create demo users
    print("Creating demo users...")
    users = [
        User(
            user_id="user_demo_owner",
            email="manager@riviera-palace.com",
            name="Sophie Martin",
            role=UserRole.ADMIN,
            hotel_id=hotel.hotel_id,
            hashed_password=hash_password("demo123"),
            picture=None
        ),
        User(
            email="reception@riviera-palace.com",
            name="Marc Dubois",
            role=UserRole.RECEPTIONIST,
            hotel_id=hotel.hotel_id,
            hashed_password=hash_password("demo123")
        ),
        User(
            email="commercial@riviera-palace.com",
            name="Claire Fontaine",
            role=UserRole.MANAGER,
            hotel_id=hotel.hotel_id,
            hashed_password=hash_password("demo123")
        )
    ]
    
    for user in users:
        await db.users.insert_one(user.model_dump())
    
    # Create canals
    print("Creating communication canals...")
    canals = [
        Canal(
            hotel_id=hotel.hotel_id,
            type=CanalType.WHATSAPP,
            status=CanalStatus.CONNECTED,
            last_sync=datetime.now(timezone.utc)
        ),
        Canal(
            hotel_id=hotel.hotel_id,
            type=CanalType.INSTAGRAM,
            status=CanalStatus.CONNECTED,
            last_sync=datetime.now(timezone.utc)
        ),
        Canal(
            hotel_id=hotel.hotel_id,
            type=CanalType.EMAIL,
            status=CanalStatus.CONNECTED,
            last_sync=datetime.now(timezone.utc)
        ),
        Canal(
            hotel_id=hotel.hotel_id,
            type=CanalType.WEB,
            status=CanalStatus.CONNECTED,
            last_sync=datetime.now(timezone.utc)
        )
    ]
    
    canal_dict = {}
    for canal in canals:
        await db.canals.insert_one(canal.model_dump())
        canal_dict[canal.type] = canal
    
    # Create guests
    print("Creating guest profiles...")
    guests_data = [
        {
            "name": "Alessandro Rossi",
            "email": "alessandro.rossi@gmail.com",
            "phone": "+39 340 123 4567",
            "language": "it",
            "channels_used": [CanalType.WHATSAPP],
            "nb_stays": 2,
            "estimated_client_value": 3500.0,
            "tags": ["VIP", "Fidèle"]
        },
        {
            "name": "Emma Schmidt",
            "email": "emma.schmidt@gmail.com",
            "language": "de",
            "channels_used": [CanalType.EMAIL],
            "nb_stays": 0,
            "estimated_client_value": 0.0,
            "tags": ["Prospect"]
        },
        {
            "name": "James Anderson",
            "email": "james.anderson@outlook.com",
            "language": "en",
            "channels_used": [CanalType.INSTAGRAM],
            "nb_stays": 0,
            "estimated_client_value": 0.0,
            "tags": []
        },
        {
            "name": "Marie Dupont",
            "email": "marie.dupont@orange.fr",
            "phone": "+33 6 12 34 56 78",
            "language": "fr",
            "channels_used": [CanalType.WEB, CanalType.EMAIL],
            "nb_stays": 1,
            "estimated_client_value": 890.0,
            "tags": []
        },
        {
            "name": "Dmitri Volkov",
            "phone": "+7 916 123 4567",
            "language": "ru",
            "channels_used": [CanalType.WHATSAPP],
            "nb_stays": 3,
            "estimated_client_value": 7200.0,
            "tags": ["VIP", "Groupe"]
        }
    ]
    
    guests = []
    for guest_data in guests_data:
        guest = Guest(
            hotel_id=hotel.hotel_id,
            **guest_data
        )
        await db.guests.insert_one(guest.model_dump())
        guests.append(guest)
    
    # Create conversations and messages
    print("Creating conversations and messages...")
    
    # Conversation 1: Alessandro - WhatsApp - New booking inquiry
    conv1 = Conversation(
        hotel_id=hotel.hotel_id,
        guest_id=guests[0].guest_id,
        canal_id=canal_dict[CanalType.WHATSAPP].canal_id,
        canal_type=CanalType.WHATSAPP,
        status=ConversationStatus.NEW,
        priority=8,
        detected_subject="Réservation",
        last_message="Bonjour, je voudrais réserver une suite junior pour...",
        last_message_at=datetime.now(timezone.utc) - timedelta(minutes=5)
    )
    await db.conversations.insert_one(conv1.model_dump())
    
    messages_conv1 = [
        Message(
            conversation_id=conv1.conversation_id,
            direction=MessageDirection.INBOUND,
            content="Bonjour, je voudrais réserver une suite junior pour 3 nuits du 15 au 18 juillet. Quel est votre meilleur tarif ?",
            author=MessageAuthor.GUEST,
            timestamp=datetime.now(timezone.utc) - timedelta(minutes=5)
        )
    ]
    for msg in messages_conv1:
        await db.messages.insert_one(msg.model_dump())
    
    # Conversation 2: Emma - Email - Question about amenities
    conv2 = Conversation(
        hotel_id=hotel.hotel_id,
        guest_id=guests[1].guest_id,
        canal_id=canal_dict[CanalType.EMAIL].canal_id,
        canal_type=CanalType.EMAIL,
        status=ConversationStatus.IN_PROGRESS,
        priority=5,
        detected_subject="Question",
        assigned_to=users[1].user_id,
        last_message="Vielen Dank! Haben Sie auch einen Pool?",
        last_message_at=datetime.now(timezone.utc) - timedelta(hours=2)
    )
    await db.conversations.insert_one(conv2.model_dump())
    
    messages_conv2 = [
        Message(
            conversation_id=conv2.conversation_id,
            direction=MessageDirection.INBOUND,
            content="Guten Tag, ich interessiere mich für ein Zimmer im August. Haben Sie einen Spa-Bereich?",
            author=MessageAuthor.GUEST,
            timestamp=datetime.now(timezone.utc) - timedelta(hours=3)
        ),
        Message(
            conversation_id=conv2.conversation_id,
            direction=MessageDirection.OUTBOUND,
            content="Bonjour Emma, oui nous avons un spa complet avec hammam, sauna et piscine chauffée. Je peux vous envoyer notre brochure ?",
            author=MessageAuthor.USER,
            author_user_id=users[1].user_id,
            timestamp=datetime.now(timezone.utc) - timedelta(hours=2, minutes=30)
        ),
        Message(
            conversation_id=conv2.conversation_id,
            direction=MessageDirection.INBOUND,
            content="Vielen Dank! Haben Sie auch einen Pool?",
            author=MessageAuthor.GUEST,
            timestamp=datetime.now(timezone.utc) - timedelta(hours=2)
        )
    ]
    for msg in messages_conv2:
        await db.messages.insert_one(msg.model_dump())
    
    # Conversation 3: James - Instagram - Price inquiry
    conv3 = Conversation(
        hotel_id=hotel.hotel_id,
        guest_id=guests[2].guest_id,
        canal_id=canal_dict[CanalType.INSTAGRAM].canal_id,
        canal_type=CanalType.INSTAGRAM,
        status=ConversationStatus.NEW,
        priority=7,
        detected_subject="Prix",
        last_message="Hi! How much for a sea view room in September?",
        last_message_at=datetime.now(timezone.utc) - timedelta(minutes=15)
    )
    await db.conversations.insert_one(conv3.model_dump())
    
    messages_conv3 = [
        Message(
            conversation_id=conv3.conversation_id,
            direction=MessageDirection.INBOUND,
            content="Hi! How much for a sea view room in September?",
            author=MessageAuthor.GUEST,
            timestamp=datetime.now(timezone.utc) - timedelta(minutes=15)
        )
    ]
    for msg in messages_conv3:
        await db.messages.insert_one(msg.model_dump())
    
    # Conversation 4: Marie - Web - Resolved booking
    conv4 = Conversation(
        hotel_id=hotel.hotel_id,
        guest_id=guests[3].guest_id,
        canal_id=canal_dict[CanalType.WEB].canal_id,
        canal_type=CanalType.WEB,
        status=ConversationStatus.RESOLVED,
        priority=3,
        detected_subject="Réservation",
        assigned_to=users[2].user_id,
        last_message="Parfait, merci beaucoup !",
        last_message_at=datetime.now(timezone.utc) - timedelta(days=1)
    )
    await db.conversations.insert_one(conv4.model_dump())
    
    messages_conv4 = [
        Message(
            conversation_id=conv4.conversation_id,
            direction=MessageDirection.INBOUND,
            content="Bonjour, j'ai réservé en ligne mais je n'ai pas reçu de confirmation par email",
            author=MessageAuthor.GUEST,
            timestamp=datetime.now(timezone.utc) - timedelta(days=1, hours=2)
        ),
        Message(
            conversation_id=conv4.conversation_id,
            direction=MessageDirection.OUTBOUND,
            content="Bonjour Marie, je vérifie immédiatement votre dossier. Pouvez-vous me donner votre numéro de réservation ?",
            author=MessageAuthor.USER,
            author_user_id=users[2].user_id,
            timestamp=datetime.now(timezone.utc) - timedelta(days=1, hours=1)
        ),
        Message(
            conversation_id=conv4.conversation_id,
            direction=MessageDirection.INBOUND,
            content="Oui c'est le RES-2025-0142",
            author=MessageAuthor.GUEST,
            timestamp=datetime.now(timezone.utc) - timedelta(days=1, minutes=45)
        ),
        Message(
            conversation_id=conv4.conversation_id,
            direction=MessageDirection.OUTBOUND,
            content="Votre réservation est bien confirmée ! Je viens de vous renvoyer l'email de confirmation. Vous devriez le recevoir dans quelques minutes.",
            author=MessageAuthor.USER,
            author_user_id=users[2].user_id,
            timestamp=datetime.now(timezone.utc) - timedelta(days=1, minutes=30)
        ),
        Message(
            conversation_id=conv4.conversation_id,
            direction=MessageDirection.INBOUND,
            content="Parfait, merci beaucoup !",
            author=MessageAuthor.GUEST,
            timestamp=datetime.now(timezone.utc) - timedelta(days=1)
        )
    ]
    for msg in messages_conv4:
        await db.messages.insert_one(msg.model_dump())
    
    # Conversation 5: Dmitri - WhatsApp - VIP group booking
    conv5 = Conversation(
        hotel_id=hotel.hotel_id,
        guest_id=guests[4].guest_id,
        canal_id=canal_dict[CanalType.WHATSAPP].canal_id,
        canal_type=CanalType.WHATSAPP,
        status=ConversationStatus.IN_PROGRESS,
        priority=9,
        detected_subject="Groupe",
        assigned_to=users[0].user_id,
        tags=["VIP", "Groupe"],
        last_message="Need 5 suites for my business partners",
        last_message_at=datetime.now(timezone.utc) - timedelta(minutes=30)
    )
    await db.conversations.insert_one(conv5.model_dump())
    
    messages_conv5 = [
        Message(
            conversation_id=conv5.conversation_id,
            direction=MessageDirection.INBOUND,
            content="Hello Sophie, I'm coming back to Cannes in October. Need 5 suites for my business partners. Can you arrange?",
            author=MessageAuthor.GUEST,
            timestamp=datetime.now(timezone.utc) - timedelta(minutes=30)
        )
    ]
    for msg in messages_conv5:
        await db.messages.insert_one(msg.model_dump())
    
    # Create analytics snapshot
    print("Creating analytics snapshot...")
    snapshot = AnalyticsSnapshot(
        hotel_id=hotel.hotel_id,
        date=datetime.now(timezone.utc),
        total_conversations=247,
        response_rate_5min=0.78,
        confirmed_reservations=18,
        estimated_captured_revenue=4200.0,
        estimated_lost_revenue=1800.0
    )
    await db.analytics_snapshots.insert_one(snapshot.model_dump())
    
    print("✅ Database seeding completed!")
    print(f"\n📊 Summary:")
    print(f"  - Hotel: {hotel.name}")
    print(f"  - Users: {len(users)}")
    print(f"  - Canals: {len(canals)}")
    print(f"  - Guests: {len(guests)}")
    print(f"  - Conversations: 5")
    print(f"  - Messages: {len(messages_conv1) + len(messages_conv2) + len(messages_conv3) + len(messages_conv4) + len(messages_conv5)}")
    print(f"\n🔐 Demo credentials:")
    print(f"  Email: manager@riviera-palace.com")
    print(f"  Password: demo123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
