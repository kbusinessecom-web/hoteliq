from pypdf import PdfReader
from docx import Document
from emergentintegrations.llm.chat import LlmChat, UserMessage
import base64
import io
import os
from typing import Dict, Optional
from dotenv import load_dotenv

load_dotenv()

class DocumentAnalysisService:
    """Service for extracting and analyzing hotel documents"""
    
    def __init__(self):
        self.api_key = os.getenv("EMERGENT_LLM_KEY")
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found")
    
    def extract_text_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF bytes"""
        try:
            pdf_file = io.BytesIO(file_content)
            reader = PdfReader(pdf_file)
            
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            
            return text.strip()
        except Exception as e:
            print(f"PDF extraction error: {e}")
            raise ValueError(f"Impossible de lire le PDF: {str(e)}")
    
    def extract_text_from_docx(self, file_content: bytes) -> str:
        """Extract text from DOCX bytes"""
        try:
            doc_file = io.BytesIO(file_content)
            doc = Document(doc_file)
            
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            return text.strip()
        except Exception as e:
            print(f"DOCX extraction error: {e}")
            raise ValueError(f"Impossible de lire le DOCX: {str(e)}")
    
    def extract_text_from_txt(self, file_content: bytes) -> str:
        """Extract text from TXT bytes"""
        try:
            return file_content.decode('utf-8')
        except Exception as e:
            print(f"TXT extraction error: {e}")
            raise ValueError(f"Impossible de lire le TXT: {str(e)}")
    
    def extract_text(self, file_content: bytes, filename: str) -> str:
        """Extract text based on file extension"""
        extension = filename.lower().split('.')[-1]
        
        if extension == 'pdf':
            return self.extract_text_from_pdf(file_content)
        elif extension in ['docx', 'doc']:
            return self.extract_text_from_docx(file_content)
        elif extension == 'txt':
            return self.extract_text_from_txt(file_content)
        else:
            raise ValueError(f"Format de fichier non supporté: {extension}")
    
    async def analyze_brand_voice(self, document_text: str, hotel_name: str) -> Dict:
        """Analyze document to extract brand voice and hotel information"""
        
        system_message = f"""Tu es un expert en branding hôtelier et analyse de contenu.
Analyse le document fourni pour {hotel_name} et extrais les informations suivantes:

1. TON DE LA MARQUE: Identifie le ton général (formel, chaleureux, luxueux, décontracté, etc.)
2. VALEURS: Quelles sont les valeurs mises en avant?
3. POSITIONNEMENT: Comment l'hôtel se positionne-t-il? (luxe, boutique, familial, etc.)
4. SERVICES CLÉS: Liste des services principaux mentionnés
5. TARIFS: Informations tarifaires si présentes
6. FAQ: Questions fréquentes et réponses si présentes
7. MOTS-CLÉS: Mots et expressions récurrents qui définissent la marque

Réponds au format JSON avec ces clés: tone, values, positioning, services, pricing, faq, keywords.
Sois concis et précis."""
        
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"brand_analysis_{hotel_name}",
                system_message=system_message
            ).with_model("openai", "gpt-5.2")
            
            # Limiter le texte si trop long (max 8000 chars)
            truncated_text = document_text[:8000] if len(document_text) > 8000 else document_text
            
            user_message = UserMessage(text=f"Voici le document à analyser:\n\n{truncated_text}")
            response = await chat.send_message(user_message)
            
            # Parse JSON response
            import json
            try:
                brand_profile = json.loads(response)
            except json.JSONDecodeError:
                # Si l'IA ne retourne pas du JSON propre, créer un profil basique
                brand_profile = {
                    "tone": "professionnel et chaleureux",
                    "values": ["service client", "qualité", "attention aux détails"],
                    "positioning": "hôtel boutique premium",
                    "services": [],
                    "pricing": {},
                    "faq": [],
                    "keywords": []
                }
            
            # Générer un résumé pour l'IA de suggestion
            brand_profile['summary'] = await self._generate_brand_summary(brand_profile, hotel_name)
            
            return brand_profile
            
        except Exception as e:
            print(f"Brand analysis error: {e}")
            raise ValueError(f"Erreur lors de l'analyse: {str(e)}")
    
    async def _generate_brand_summary(self, brand_profile: Dict, hotel_name: str) -> str:
        """Generate a concise summary for AI context"""
        summary_parts = [
            f"Hôtel: {hotel_name}",
            f"Ton: {brand_profile.get('tone', 'professionnel')}",
            f"Positionnement: {brand_profile.get('positioning', 'hôtel boutique')}",
        ]
        
        if brand_profile.get('values'):
            values = ', '.join(brand_profile['values'][:3])
            summary_parts.append(f"Valeurs: {values}")
        
        if brand_profile.get('services'):
            services = ', '.join(brand_profile['services'][:5])
            summary_parts.append(f"Services: {services}")
        
        return " | ".join(summary_parts)

# Singleton instance
document_analysis_service = DocumentAnalysisService()
