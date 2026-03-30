# HotelIQ - PRD (Product Requirements Document)

## Original Problem Statement
Build a SaaS application named **HotelIQ** — a unified AI inbox for boutique hotels on the French Riviera.
The app centralizes WhatsApp, Instagram DM, Email, and Website chat into a single intelligent inbox.
User communicates in **French**. Uses the **Emergent LLM Key** for all AI capabilities.

## User Personas
- **Hotel Manager** (Sophie Martin): Oversees all conversations, uses analytics
- **Receptionist** (Marc Dubois): Handles daily guest messaging
- **Concierge** (Claire Fontaine): Upsells services, manages guest experience

## Core Requirements
1. Unified inbox for all guest communication channels
2. AI-generated reply suggestions (Emergent LLM Key)
3. Real-time sync via WebSockets (Socket.IO)
4. JWT authentication (secure, classic)
5. 4-step onboarding with hotel profile setup
6. Document upload (PDF/DOCX) for AI brand training
7. Pre-defined message templates with variable substitution
8. Internal team notes with @mentions (invisible to guests)
9. Push notifications for @mentions (Expo Notifications)
10. Analytics dashboard with upsell/loyalty/review metrics

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB) + python-socketio
- **Frontend**: React Native + Expo Router + Zustand
- **AI**: emergentintegrations (Emergent Universal LLM Key)
- **Auth**: JWT Bearer Token
- **Real-time**: Socket.IO bi-directional

## Key API Endpoints
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/conversations` (with filters)
- `GET /api/conversations/{id}/messages`
- `POST /api/conversations/{id}/messages` (supports `message_type`, `mentions`)
- `POST /api/conversations/{id}/suggest` (AI suggestion)
- `GET /api/templates` (with category filter)
- `POST /api/templates` (create template)
- `POST /api/templates/{id}/use` (track usage)
- `GET /api/users` (team members, no sensitive fields)
- `POST /api/push-tokens` (register device push token)
- `POST /api/documents/upload`
- `WS /socket.io/`

## DB Schema
- `hotels`: id, name, brand_profile, training_documents
- `users`: id, email, hashed_password, role, hotel_id
- `conversations`: id, hotel_id, guest_id, canal_type, status, priority
- `messages`: id, conversation_id, direction, content, author, message_type, mentions, timestamp
- `guests`: id, hotel_id, name, contact_info
- `message_templates`: id, hotel_id, name, category, content, language, variables
- `push_tokens`: id, user_id, hotel_id, token, device_type

## Seed Data
- 1 hotel: Riviera Palace
- 3 users: Sophie Martin (admin), Marc Dubois (receptionist), Claire Fontaine (manager)
- 5 conversations with mock messages (WhatsApp, Instagram, Email, Website)
- 5 guests
- 15 message templates (welcome, confirmation, info, urgency, follow_up, upsell)

---

## P0/P1/P2 Roadmap

### P0 - DONE
- [x] JWT Auth (login/register/me)
- [x] 4-step Onboarding wizard
- [x] Inbox with conversation list
- [x] Conversation detail with AI suggestions
- [x] Real-time WebSocket messaging
- [x] Document upload for AI brand context
- [x] Emoji picker in composer
- [x] Message Templates (Feature 5) — 15 default templates seeded
- [x] Internal Notes + @Mentions (Feature 6)
- [x] Push Notifications infrastructure (Feature 9 partial)
- [x] AI History Analysis (Feature 8) — upsell/loyalty/review insights via GPT-5.2

### P1 - UPCOMING
- [ ] Feature 9: Full push notifications (deeplink on tap, badge count)
- [ ] Settings screen: Secure input for Meta API keys, webhook management

### P2 - FUTURE
- [ ] Social Login via Emergent Google Auth
- [ ] Multi-hotel support (SaaS billing)
- [ ] Mobile app deep-links (booking confirmation, upsell tap)
- [ ] Conversation assignment workflow (drag-and-drop)
- [ ] Conversation/[id].tsx refactor into sub-components (MessageBubble, ChatComposer)
