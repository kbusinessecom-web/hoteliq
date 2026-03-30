"""
Script to create default message templates
Run with: python create_default_templates.py
"""
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import asyncio
import os
import sys

sys.path.insert(0, str(Path(__file__).parent))

from models import MessageTemplate

load_dotenv()

DEFAULT_TEMPLATES = [
    # Bienvenue
    {
        "name": "Bienvenue - Check-in",
        "category": "welcome",
        "content": "Bonjour {{guest_name}} ! Bienvenue à {{hotel_name}} ✨ Nous sommes ravis de vous accueillir. Votre chambre {{room_number}} vous attend. N'hésitez pas si vous avez besoin de quoi que ce soit !",
        "language": "fr",
        "is_default": True,
    },
    {
        "name": "Bienvenue VIP",
        "category": "welcome",
        "content": "Cher {{guest_name}}, c'est un honneur de vous accueillir au {{hotel_name}} 👑 Votre suite {{room_number}} est prête. Notre conciergerie est à votre entière disposition 24/7. Excellent séjour !",
        "language": "fr",
        "is_default": True,
    },
    
    # Confirmation
    {
        "name": "Confirmation réservation",
        "category": "confirmation",
        "content": "Parfait {{guest_name}} ! Votre réservation est confirmée ✅\n📅 {{checkin_date}} - {{checkout_date}}\n🛏️ {{room_type}}\n💰 {{price}}\n\nVous recevrez un email de confirmation sous peu.",
        "language": "fr",
        "is_default": True,
    },
    {
        "name": "Confirmation modification",
        "category": "confirmation",
        "content": "Bonjour {{guest_name}}, votre demande de modification a bien été prise en compte ✅ Les changements seront effectifs dans quelques instants. Merci de votre confiance !",
        "language": "fr",
        "is_default": True,
    },
    
    # Information
    {
        "name": "Horaires petit-déjeuner",
        "category": "info",
        "content": "Notre petit-déjeuner est servi de 7h à 10h30 en semaine et de 7h30 à 11h le week-end 🍽️ Au restaurant principal ou en room service. Bon appétit !",
        "language": "fr",
        "is_default": True,
    },
    {
        "name": "WiFi et accès",
        "category": "info",
        "content": "Connexion WiFi :\n📶 Réseau : {{hotel_name}}_Guest\n🔑 Mot de passe : {{wifi_password}}\n\nDébit fibre 1Gb/s dans tout l'établissement !",
        "language": "fr",
        "is_default": True,
    },
    {
        "name": "Checkout et bagages",
        "category": "info",
        "content": "Le checkout est à 12h 🕛 Vous pouvez laisser vos bagages à la réception si besoin. Nous les garderons en sécurité jusqu'à votre départ !",
        "language": "fr",
        "is_default": True,
    },
    
    # Urgence
    {
        "name": "Problème chambre",
        "category": "urgency",
        "content": "{{guest_name}}, je vous prie d'accepter mes excuses pour ce désagrément 🙏 Notre équipe technique intervient immédiatement. Nous vous tenons informé dans les 10 minutes maximum.",
        "language": "fr",
        "is_default": True,
    },
    {
        "name": "Urgence résolue",
        "category": "urgency",
        "content": "Bonjour {{guest_name}}, le problème est résolu ✅ Toutes nos excuses pour ce contretemps. Nous restons à votre disposition pour assurer le meilleur séjour possible.",
        "language": "fr",
        "is_default": True,
    },
    
    # Follow-up
    {
        "name": "Feedback séjour",
        "category": "follow_up",
        "content": "Bonjour {{guest_name}} ! Comment se passe votre séjour ? 😊 Nous serions ravis de connaître vos impressions et de répondre à toutes vos questions.",
        "language": "fr",
        "is_default": True,
    },
    {
        "name": "Au revoir",
        "category": "follow_up",
        "content": "Merci {{guest_name}} pour votre séjour au {{hotel_name}} ! 🙏 Nous espérons vous revoir très bientôt. Excellent voyage de retour !",
        "language": "fr",
        "is_default": True,
    },
    {
        "name": "Demande avis",
        "category": "follow_up",
        "content": "Bonjour {{guest_name}} ! Nous espérons que vous gardez un excellent souvenir de votre séjour 😊 Votre avis compte énormément : {{review_link}}\nMerci infiniment !",
        "language": "fr",
        "is_default": True,
    },
    
    # Upsell
    {
        "name": "Upgrade chambre",
        "category": "upsell",
        "content": "{{guest_name}}, nous avons une opportunité exceptionnelle ! ✨ Upgrade vers notre Suite Deluxe avec vue mer pour seulement {{upgrade_price}}€/nuit. Intéressé(e) ?",
        "language": "fr",
        "is_default": True,
    },
    {
        "name": "Spa et wellness",
        "category": "upsell",
        "content": "Envie de détente {{guest_name}} ? 💆 Notre spa propose massage + hammam à {{spa_price}}€. Réservation directe via ce lien : {{booking_link}}",
        "language": "fr",
        "is_default": True,
    },
    {
        "name": "Restaurant gastronomique",
        "category": "upsell",
        "content": "Notre chef vous propose ce soir un menu dégustation 7 services 🍽️ avec accord mets-vins pour {{menu_price}}€/pers. Places limitées ! Réservation ?",
        "language": "fr",
        "is_default": True,
    },
]

async def create_default_templates():
    """Create default templates for all hotels"""
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("📝 Creating default message templates...")
    
    # Get all hotels
    hotels = await db.hotels.find({}, {"_id": 0, "hotel_id": 1, "owner_id": 1}).to_list(100)
    
    if not hotels:
        print("⚠️  No hotels found. Run seed_data.py first.")
        return
    
    templates_created = 0
    
    for hotel in hotels:
        hotel_id = hotel["hotel_id"]
        owner_id = hotel["owner_id"]
        
        # Check if templates already exist
        existing = await db.message_templates.count_documents({"hotel_id": hotel_id})
        if existing > 0:
            print(f"  Hotel {hotel_id} already has {existing} templates, skipping...")
            continue
        
        # Create default templates
        for template_data in DEFAULT_TEMPLATES:
            template = MessageTemplate(
                hotel_id=hotel_id,
                created_by=owner_id,
                usage_count=0,
                **template_data
            )
            await db.message_templates.insert_one(template.model_dump())
            templates_created += 1
        
        print(f"  ✅ Created {len(DEFAULT_TEMPLATES)} templates for hotel {hotel_id}")
    
    print(f"\n🎉 Done! Created {templates_created} templates total")
    client.close()

if __name__ == "__main__":
    asyncio.run(create_default_templates())
