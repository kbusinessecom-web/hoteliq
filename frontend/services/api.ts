import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

const api = {
  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_URL}/api${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    
    // Add auth token if available
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include',
    };
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  },
  
  // Auth
  auth: {
    register: (data: { email: string; name: string; password: string; role?: string }) =>
      api.request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    
    login: (email: string, password: string) =>
      api.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    
    googleExchange: (sessionId: string) =>
      api.request('/auth/google/exchange', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) }),
    
    me: () => api.request('/auth/me'),
    
    logout: () => api.request('/auth/logout', { method: 'POST' }),
  },
  
  // Hotels
  hotels: {
    create: (data: any) => api.request('/hotels', { method: 'POST', body: JSON.stringify(data) }),
    getMy: () => api.request('/hotels/my'),
  },
  
  // Canals
  canals: {
    create: (data: { type: string; credentials?: any }) =>
      api.request('/canals', { method: 'POST', body: JSON.stringify(data) }),
    getAll: () => api.request('/canals'),
  },
  
  // Conversations
  conversations: {
    getAll: (params?: { status?: string; canal_type?: string; assigned_to_me?: boolean }) => {
      const query = new URLSearchParams();
      if (params?.status) query.append('status', params.status);
      if (params?.canal_type) query.append('canal_type', params.canal_type);
      if (params?.assigned_to_me) query.append('assigned_to_me', 'true');
      return api.request(`/conversations?${query.toString()}`);
    },
    
    getById: (id: string) => api.request(`/conversations/${id}`),
    
    update: (id: string, data: { status?: string; assigned_to?: string; tags?: string[] }) =>
      api.request(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    
    getMessages: (id: string) => api.request(`/conversations/${id}/messages`),
    
    sendMessage: (id: string, content: string, options?: { message_type?: string; mentions?: string[] }) =>
      api.request(`/conversations/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content,
          direction: options?.message_type === 'internal_note' ? 'outbound' : 'outbound',
          author: 'user',
          message_type: options?.message_type || 'normal',
          mentions: options?.mentions || [],
        }),
      }),
  },
  
  // AI
  ai: {
    getSuggestion: (conversationId: string, guestMessage: string, guestLanguage: string = 'fr') =>
      api.request('/ai/suggest', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: conversationId,
          guest_message: guestMessage,
          guest_language: guestLanguage,
        }),
      }),
  },
  
  // Guests
  guests: {
    getAll: () => api.request('/guests'),
    getById: (id: string) => api.request(`/guests/${id}`),
  },
  
  // Reports
  reports: {
    getAll: () => api.request('/reports'),
    send: () => api.request('/reports/send', { method: 'POST' }),
  },

  // AI Insights
  aiInsights: {
    analyze: (conversationId: string) =>
      api.request(`/ai/analyze/${conversationId}`, { method: 'POST' }),
    analyzeAll: () => api.request('/ai/analyze-all', { method: 'POST' }),
    getAll: (params?: { status?: string; conversation_id?: string }) => {
      const query = new URLSearchParams();
      if (params?.status) query.append('status', params.status);
      if (params?.conversation_id) query.append('conversation_id', params.conversation_id);
      return api.request(`/ai/insights?${query.toString()}`);
    },
    updateStatus: (insightId: string, status: 'sent' | 'dismissed') =>
      api.request(`/ai/insights/${insightId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },
  
  // Documents
  documents: {
    upload: async (fileUri: string, fileName: string, mimeType: string) => {
      const formData = new FormData();
      
      // @ts-ignore - React Native FormData supports uri
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      });
      
      const url = `${API_URL}/api/documents/upload`;
      const token = authToken;
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }
      
      return await response.json();
    },
    
    getBrandProfile: () => api.request('/hotels/brand-profile'),
  },

  // Templates
  templates: {
    getAll: (category?: string) => {
      const query = category ? `?category=${category}` : '';
      return api.request(`/templates${query}`);
    },
    create: (data: { name: string; category: string; content: string; language?: string }) =>
      api.request('/templates', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; category?: string; content?: string }) =>
      api.request(`/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => api.request(`/templates/${id}`, { method: 'DELETE' }),
    use: (id: string) => api.request(`/templates/${id}/use`, { method: 'POST' }),
  },

  // Team Members
  users: {
    getTeam: () => api.request('/users'),
  },

  // Push Notifications
  pushTokens: {
    register: (token: string, deviceType: string) =>
      api.request('/push-tokens', {
        method: 'POST',
        body: JSON.stringify({ token, device_type: deviceType }),
      }),
  },
};

export default api;
