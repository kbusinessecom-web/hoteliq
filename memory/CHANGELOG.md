# HotelIQ - CHANGELOG

## Session 1 — Initial Build
**Date**: Before fork
- Backend: FastAPI + MongoDB setup, JWT auth, seed data
- Frontend: Expo Router structure, login screen, main tabs
- Feature: Conversation detail with AI suggestions (emergentintegrations)
- Feature: 4-step Onboarding wizard
- Feature: Real-time WebSocket messaging (Socket.IO)
- Feature: Document upload (PDF/DOCX) for AI brand training
- Feature: Emoji picker in message composer

## Session 2 — Templates + Internal Notes (March 30, 2026)
**Branch/Fork**: hoteliq-templates

### Feature 5: Message Templates
- `create_default_templates.py` executed → 15 templates seeded in MongoDB
- Backend: GET/POST/PATCH/DELETE/use endpoints at `/api/templates`
- Models: `MessageTemplate`, `MessageTemplateCreate`, `MessageTemplateUpdate`
- Frontend: `TemplatesPicker.tsx` component — category tabs (welcome/confirmation/info/urgency/follow_up/upsell), search bar, variable resolution (`{{guest_name}}`, `{{wifi_password}}`, etc.)
- Integration: Document icon in conversation composer opens TemplatesPicker modal

### Feature 6: Internal Notes + @Mentions + Push Notifications
- Models: `MessageType` enum (NORMAL/INTERNAL_NOTE), `PushToken` model
- `Message` updated with `message_type`, `mentions`, `author_name` fields
- Backend: `send_message` handles `internal_note` type (no `last_message` update) + sends Expo push notifications to mentioned users
- Backend: `GET /api/users` endpoint (team members, using `UserPublic` — no sensitive fields)
- Backend: `POST /api/push-tokens` endpoint (register Expo push token per device)
- Frontend: `MentionPicker.tsx` — popup above composer when `@` is typed
- Frontend: Lock icon in composer activates internal note mode (yellow UI, banner)
- Frontend: `@` detection in `handleTextChange` → shows MentionPicker, auto-switches to note mode
- Frontend: Internal note bubbles styled with dashed yellow border + lock icon
- Frontend: Push token auto-registered on conversation screen load
- `expo-notifications` + `expo-device` installed
- `app.json` updated with expo-notifications plugin
- `_layout.tsx` updated with `Notifications.setNotificationHandler`

### Security Fix
- `UserPublic` model added to exclude `hashed_password` and `google_id` from `/api/users` response
