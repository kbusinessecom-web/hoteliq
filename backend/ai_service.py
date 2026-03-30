from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv
import os
from typing import Dict, Optional

load_dotenv()

class AIService:
    """AI service for generating response suggestions"""
    
    def __init__(self):
        self.api_key = os.getenv("EMERGENT_LLM_KEY")
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found in environment variables")
    
    async def generate_response_suggestion(
        self,
        guest_message: str,
        guest_name: str,
        hotel_name: str,
        conversation_history: list,
        language: str = "fr",
        hotel_context: Optional[Dict] = None
    ) -> Dict[str, any]:
        """
        Generate AI-powered response suggestion for hotel receptionist
        
        Args:
            guest_message: The guest's last message
            guest_name: Name of the guest
            hotel_name: Name of the hotel
            conversation_history: Previous messages in conversation
            language: Target language (fr, en, de, it, ru)
            hotel_context: Hotel-specific context (FAQs, pricing, etc.)
        
        Returns:
            Dict with 'suggestion' and 'confidence_score'
        """
        
        # Build system message with hotel context
        system_message = f"""Tu es un assistant IA pour {hotel_name}, un hôtel boutique premium.
Ton rôle est de suggérer des réponses professionnelles, chaleureuses et personnalisées pour les réceptionnistes.

CONTEXTE HÔTEL:
- Hôtel: {hotel_name}
- Positionnement: Hôtel boutique 4-5 étoiles sur la Côte d'Azur
- Ton: Professionnel, chaleureux, attentionné

RÈGLES:
1. Réponses courtes et directes (2-4 phrases max)
2. Toujours personnaliser avec le prénom du client
3. Ton professionnel mais chaleureux
4. Proposer des actions concrètes
5. Répondre dans la langue: {language}

{"INFORMATIONS ADDITIONNELLES: " + str(hotel_context) if hotel_context else ""}
"""
        
        # Build conversation context
        context = f"Client: {guest_name}\n\n"
        if conversation_history:
            context += "Historique de conversation:\n"
            for msg in conversation_history[-3:]:  # Last 3 messages
                author = "Client" if msg.get("direction") == "inbound" else "Réceptionniste"
                context += f"{author}: {msg.get('content')}\n"
        
        context += f"\n\nNouveau message du client:\n{guest_message}\n\nSuggère une réponse appropriée:"
        
        try:
            # Create chat instance
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"suggestion_{guest_name}",
                system_message=system_message
            ).with_model("openai", "gpt-5.2")
            
            # Generate suggestion
            user_message = UserMessage(text=context)
            response = await chat.send_message(user_message)
            
            # Calculate confidence score based on response quality
            confidence_score = self._calculate_confidence(response, guest_message)
            
            return {
                "suggestion": response.strip(),
                "confidence_score": confidence_score,
                "language": language
            }
            
        except Exception as e:
            print(f"AI Service Error: {e}")
            # Fallback generic response
            return {
                "suggestion": self._get_fallback_response(guest_name, language),
                "confidence_score": 0.3,
                "language": language
            }
    
    def _calculate_confidence(self, response: str, guest_message: str) -> float:
        """Calculate confidence score based on response quality"""
        score = 0.7  # Base score
        
        # Longer responses slightly higher confidence
        if len(response) > 50:
            score += 0.1
        
        # Contains specific details
        if any(word in response.lower() for word in ["€", "prix", "tarif", "disponible", "réservation"]):
            score += 0.1
        
        # Personalized
        if len(response.split()) > 10:
            score += 0.1
        
        return min(score, 0.99)
    
    def _get_fallback_response(self, guest_name: str, language: str) -> str:
        """Fallback response when AI fails"""
        responses = {
            "fr": f"Bonjour {guest_name}, merci pour votre message. Notre équipe va vous répondre dans les plus brefs délais.",
            "en": f"Hello {guest_name}, thank you for your message. Our team will get back to you shortly.",
            "de": f"Hallo {guest_name}, vielen Dank für Ihre Nachricht. Unser Team wird sich in Kürze bei Ihnen melden.",
            "it": f"Ciao {guest_name}, grazie per il tuo messaggio. Il nostro team ti risponderà al più presto.",
        }
        return responses.get(language, responses["fr"])
    
    async def translate_text(self, text: str, target_language: str) -> str:
        """Translate text using AI"""
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id="translation",
                system_message=f"Tu es un traducteur professionnel. Traduis le texte en {target_language}. Réponds UNIQUEMENT avec la traduction, sans explications."
            ).with_model("openai", "gpt-5.2")
            
            user_message = UserMessage(text=text)
            response = await chat.send_message(user_message)
            
            return response.strip()
        except Exception as e:
            print(f"Translation Error: {e}")
            return text  # Return original if translation fails

# Singleton instance
ai_service = AIService()
