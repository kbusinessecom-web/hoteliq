# HotelIQ - SaaS de Messagerie Unifiée pour Hôtels Boutique

## 🏨 Description

HotelIQ est une application mobile SaaS conçue pour les hôtels boutique 4-5 étoiles de la Côte d'Azur et de Savoie. Elle centralise toutes les communications clients (WhatsApp, Instagram, Email, Site Web) dans une inbox unifiée avec assistance IA pour des réponses rapides et personnalisées.

## ✨ Fonctionnalités Principales

### 🔐 Authentification
- **Connexion classique** : Email + mot de passe avec JWT
- **Google OAuth** : Connexion sociale via Emergent Auth (à configurer)
- **Gestion de session** : Sessions sécurisées de 7 jours

### 💬 Inbox Unifiée
- Centralisation de toutes les conversations (WhatsApp, Instagram, Email, Web)
- Filtrage par canal de communication
- Badges de statut colorés (Nouveau, En cours, Résolu)
- Vue temps réel des conversations
- Tags personnalisables (VIP, Groupe, etc.)

### 🤖 Intelligence Artificielle
- **Suggestions de réponses** : IA alimentée par GPT-5.2 d'OpenAI
- **Score de confiance** : Chaque suggestion est évaluée (0-1)
- **Multilingue** : Support FR, EN, DE, IT, RU
- **Traduction automatique** : Via IA pour conversations internationales

### 📊 Dashboard Analytics
- KPIs en temps réel :
  - Nombre de conversations
  - Taux de réponse <5min
  - Réservations confirmées
  - CA capturé vs CA perdu
- Alertes sur revenus potentiellement perdus
- Statistiques de performance

### 👥 Gestion des Clients
- Profils clients enrichis
- Historique des séjours
- Valeur client estimée
- Tags VIP et segments
- Canaux de communication préférés

### ⚙️ Paramètres
- Profil utilisateur
- Gestion des canaux connectés
- Configuration hôtel
- Notifications

## 🛠 Architecture Technique

### Backend
- **Framework** : FastAPI (Python)
- **Base de données** : MongoDB
- **IA** : OpenAI GPT-5.2 via emergentintegrations
- **Authentification** : JWT + Emergent Google OAuth
- **API** : RESTful avec préfixe `/api`

### Frontend  
- **Framework** : Expo (React Native)
- **Navigation** : Expo Router (file-based routing)
- **State Management** : Zustand
- **Data Fetching** : TanStack Query
- **Design System** : Navy Deep × Riviera Gold

### Design System
- **Couleurs primaires** : Navy #1A3C7A
- **Accent** : Gold #C4952A
- **Typography** : System fonts optimisés mobile
- **Spacing** : Grille 8px
- **Touch targets** : Minimum 44x44px

## 📱 Écrans Disponibles

1. **Login** : Authentification (classique + Google)
2. **Inbox** : Liste des conversations avec filtres
3. **Dashboard** : Analytics et KPIs
4. **Clients** : Liste des guests avec profils
5. **Paramètres** : Configuration utilisateur et hôtel

## 🚀 Installation & Démarrage

### Prérequis
- Python 3.11+
- Node.js 18+
- MongoDB running on localhost:27017
- Yarn package manager

### Backend

```bash
cd /app/backend

# Charger les données de démo
python seed_data.py

# Le serveur tourne sur port 8001
```

### Frontend

```bash
cd /app/frontend

# Démarrer Expo
yarn start

# L'app est accessible via:
# - Web: https://saas-builder-105.preview.emergentagent.com
# - QR Code pour Expo Go
```

## 🔑 Credentials de Test

### Compte Admin
- Email: `manager@riviera-palace.com`
- Password: `demo123`
- Rôle: Admin
- Hôtel: Le Riviera Palace (Cannes, 5★)

### Compte Réceptionniste
- Email: `reception@riviera-palace.com`
- Password: `demo123`
- Rôle: Receptionist

### Compte Manager Commercial
- Email: `commercial@riviera-palace.com`
- Password: `demo123`
- Rôle: Manager

## 📊 Données Mockées

L'application inclut :
- **1 hôtel** : Le Riviera Palace (Cannes, 5★, 45 chambres)
- **3 utilisateurs** avec rôles différents
- **4 canaux connectés** : WhatsApp, Instagram, Email, Web
- **5 guests** internationaux (IT, DE, EN, FR, RU)
- **5 conversations** avec messages réels
- **Analytics** : KPIs et métriques de performance

## 🌐 URLs

- **Backend API** : https://saas-builder-105.preview.emergentagent.com/api
- **Frontend Web** : https://saas-builder-105.preview.emergentagent.com
- **API Docs** : https://saas-builder-105.preview.emergentagent.com/api/docs

## 🔐 Sécurité

- Mots de passe hashés avec bcrypt
- Sessions JWT avec expiration
- Cookies HTTP-only pour sessions
- CORS configuré
- Credentials canaux chiffrés (prévu)

## 📦 Dépendances Principales

### Backend
- fastapi
- motor (MongoDB async)
- pydantic
- pyjwt
- bcrypt
- emergentintegrations (IA)

### Frontend
- expo
- expo-router
- zustand (state)
- @tanstack/react-query
- react-native-svg
- date-fns

## 🎨 Thème Visuel

L'application utilise un thème **Navy Deep × Riviera Gold** pour évoquer le luxe et le prestige des hôtels de la Côte d'Azur :

- **Navy** (#1A3C7A) : Actions principales, confiance, autorité
- **Gold** (#C4952A) : Accents premium, highlights, VIP
- **Blanc/Gris** : Interface claire et moderne
- **Couleurs canaux** :
  - WhatsApp : #25D366
  - Instagram : #E1306C
  - Email : #2C57A6
  - Web : #C4952A

## 🚧 Fonctionnalités à Implémenter (Phase 2)

1. **Écran Conversation Détail**
   - Vue complète des messages
   - Composer avec suggestions IA
   - Upload d'images/fichiers
   - Real-time avec WebSockets

2. **Onboarding**
   - 4 étapes : Hotel Info → Canaux → IA Training → Équipe
   - Configuration guidée

3. **Gestion d'équipe**
   - Invitations
   - Assignation conversations
   - Permissions par rôle

4. **Configuration canaux réels**
   - OAuth WhatsApp/Instagram
   - SMTP/IMAP Email
   - Widget Web intégrable

5. **Notifications Push**
   - Nouveaux messages
   - Alertes urgentes

6. **Mode Hors-ligne**
   - Cache local
   - Sync auto

## 📈 Roadmap

- **Phase 1 (Actuelle)** : MVP - Inbox + IA + Analytics ✅
- **Phase 2** : Conversation détail + Real-time
- **Phase 3** : Onboarding + Multi-établissement
- **Phase 4** : Intégrations PMS (Mews, Protel)

## 📝 Notes Techniques

- **Environnement** : Kubernetes container
- **Preview** : Expo tunnel avec ngrok
- **Base de données** : hoteliq_db
- **Clé IA** : Emergent Universal Key
- **Port Backend** : 8001
- **Port Frontend** : 3000

---

**Développé avec ❤️ pour les hôtels boutique de la Côte d'Azur**
