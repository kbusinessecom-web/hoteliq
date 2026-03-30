export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  RECEPTIONIST = 'receptionist',
}

export enum ConversationStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  WAITING = 'waiting',
  RESOLVED = 'resolved',
  ARCHIVED = 'archived',
}

export enum CanalType {
  WHATSAPP = 'whatsapp',
  INSTAGRAM = 'instagram',
  EMAIL = 'email',
  WEB = 'web',
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum MessageAuthor {
  GUEST = 'guest',
  USER = 'user',
  AI = 'ai',
}

export enum MessageType {
  NORMAL = 'normal',
  INTERNAL_NOTE = 'internal_note',
}

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  hotel_id?: string;
  notification_preferences: {
    email: boolean;
    push: boolean;
  };
  created_at: string;
}

export interface Hotel {
  hotel_id: string;
  name: string;
  city: string;
  nb_chambres: number;
  classification: string;
  season_type: string;
  language: string;
  subscription_plan: string;
  created_at: string;
  owner_id: string;
}

export interface Canal {
  canal_id: string;
  hotel_id: string;
  type: CanalType;
  status: string;
  created_at: string;
  last_sync?: string;
}

export interface Guest {
  guest_id: string;
  hotel_id: string;
  name: string;
  email?: string;
  phone?: string;
  language: string;
  channels_used: CanalType[];
  nb_stays: number;
  estimated_client_value: number;
  tags: string[];
  notes?: string;
  created_at: string;
}

export interface Message {
  message_id: string;
  conversation_id: string;
  direction: MessageDirection;
  content: string;
  author: MessageAuthor;
  author_user_id?: string;
  author_name?: string;
  ia_confidence_score?: number;
  message_type: MessageType;
  mentions: string[];
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  conversation_id: string;
  hotel_id: string;
  guest_id: string;
  canal_id: string;
  canal_type: CanalType;
  status: ConversationStatus;
  priority: number;
  detected_subject?: string;
  assigned_to?: string;
  last_message?: string;
  last_message_at: string;
  created_at: string;
  tags: string[];
  // Populated fields
  guest?: Guest;
}

export interface AISuggestion {
  suggestion: string;
  confidence_score: number;
  language: string;
}

export enum InsightType {
  UPSELL = 'upsell',
  LOYALTY = 'loyalty',
  REVIEW = 'review',
}

export enum InsightStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DISMISSED = 'dismissed',
}

export interface ConversationInsight {
  insight_id: string;
  conversation_id: string;
  hotel_id: string;
  guest_id: string;
  guest_name: string;
  insight_type: InsightType;
  title: string;
  description: string;
  suggested_message: string;
  confidence_score: number;
  potential_revenue: number;
  status: InsightStatus;
  created_at: string;
  updated_at: string;
}

export interface AIInsightsSummary {
  total: number;
  pending: number;
  total_potential_revenue: number;
  by_type: {
    upsell: number;
    loyalty: number;
    review: number;
  };
  insights: ConversationInsight[];
}

export interface MessageTemplate {
  template_id: string;
  hotel_id: string;
  name: string;
  category: string;
  content: string;
  language: string;
  is_default: boolean;
  usage_count: number;
  created_at: string;
  created_by: string;
}

export interface AnalyticsSnapshot {
  snapshot_id: string;
  hotel_id: string;
  date: string;
  total_conversations: number;
  response_rate_5min: number;
  confirmed_reservations: number;
  estimated_captured_revenue: number;
  estimated_lost_revenue: number;
}
