import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { getAuthToken } from './api';

const API_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

class WebSocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private currentConversationId: string | null = null;

  connect(userId: string) {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    this.userId = userId;
    const token = getAuthToken();

    this.socket = io(`${API_URL}`, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      auth: {
        user_id: userId,
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
    });

    this.socket.on('connected', (data) => {
      console.log('📡 Server message:', data.message);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
      this.currentConversationId = null;
      console.log('WebSocket disconnected');
    }
  }

  joinConversation(conversationId: string) {
    if (!this.socket?.connected) {
      console.warn('WebSocket not connected');
      return;
    }

    this.currentConversationId = conversationId;
    this.socket.emit('join_conversation', { conversation_id: conversationId });
    console.log(`Joined conversation: ${conversationId}`);
  }

  leaveConversation(conversationId: string) {
    if (!this.socket?.connected) return;

    this.socket.emit('leave_conversation', { conversation_id: conversationId });
    this.currentConversationId = null;
    console.log(`Left conversation: ${conversationId}`);
  }

  onNewMessage(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('new_message', callback);
  }

  offNewMessage() {
    if (!this.socket) return;
    this.socket.off('new_message');
  }

  onConversationUpdated(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('conversation_updated', callback);
  }

  offConversationUpdated() {
    if (!this.socket) return;
    this.socket.off('conversation_updated');
  }

  onUserTyping(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('user_typing', callback);
  }

  offUserTyping() {
    if (!this.socket) return;
    this.socket.off('user_typing');
  }

  onUserTypingStop(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('user_typing_stop', callback);
  }

  offUserTypingStop() {
    if (!this.socket) return;
    this.socket.off('user_typing_stop');
  }

  emitTypingStart(conversationId: string, userName: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing_start', { conversation_id: conversationId, user_name: userName });
  }

  emitTypingStop(conversationId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing_stop', { conversation_id: conversationId });
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const websocketService = new WebSocketService();
export default websocketService;
