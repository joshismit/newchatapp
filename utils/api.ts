import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface QRScanRequest {
  token: string;
  userId: string;
}

export interface QRScanResponse {
  success: boolean;
  challengeId?: string;
  error?: string;
}

export interface QRChallengeResponse {
  challengeId: string;
  qrPayload: string;
}

export interface QRStatusResponse {
  status: 'pending' | 'authorized' | 'expired';
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface QRConfirmResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
  };
  error?: string;
}

/**
 * Scan QR code and authorize desktop login
 */
export const scanQRCode = async (
  token: string,
  userId: string
): Promise<QRScanResponse> => {
  try {
    const response = await api.post<QRScanResponse>('/auth/qr-scan', {
      token,
      userId,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'Failed to scan QR code',
      };
    }
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

/**
 * Get stored auth token
 */
export const getAuthToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem('auth_token');
};

/**
 * Store auth token
 */
export const setAuthToken = async (token: string): Promise<void> => {
  await AsyncStorage.setItem('auth_token', token);
};

/**
 * Remove auth token
 */
export const removeAuthToken = async (): Promise<void> => {
  await AsyncStorage.removeItem('auth_token');
};

/**
 * Get stored user ID
 */
export const getUserId = async (): Promise<string | null> => {
  return AsyncStorage.getItem('user_id');
};

/**
 * Store user ID
 */
export const setUserId = async (userId: string): Promise<void> => {
  await AsyncStorage.setItem('user_id', userId);
};

/**
 * Remove user ID
 */
export const removeUserId = async (): Promise<void> => {
  await AsyncStorage.removeItem('user_id');
};

/**
 * Create QR challenge for desktop login
 */
export const createQRChallenge = async (): Promise<QRChallengeResponse> => {
  try {
    const response = await api.get<QRChallengeResponse>('/auth/qr-challenge');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to create QR challenge');
  }
};

/**
 * Check QR challenge status
 */
export const checkQRStatus = async (challengeId: string): Promise<QRStatusResponse> => {
  try {
    const response = await api.get<QRStatusResponse>('/auth/qr-status', {
      params: { challengeId },
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || 'Failed to check QR status');
  }
};

/**
 * Confirm QR challenge and get JWT token
 */
export const confirmQRChallenge = async (challengeId: string): Promise<QRConfirmResponse> => {
  try {
    const response = await api.post<QRConfirmResponse>('/auth/qr-confirm', {
      challengeId,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'Failed to confirm QR challenge',
      };
    }
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string;
  attachments?: Array<{
    type: string;
    url: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  }>;
  clientId?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  deliveredTo: string[];
  readBy: string[];
  sender?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export interface GetMessagesResponse {
  success: boolean;
  messages?: Message[];
  error?: string;
}

export interface SendMessageRequest {
  conversationId: string;
  text: string;
  clientId?: string;
  attachments?: Array<{
    type: string;
    url: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  }>;
}

export interface SendMessageResponse {
  success: boolean;
  message?: Message;
  error?: string;
}

/**
 * Get messages for a conversation
 */
export const getMessages = async (
  conversationId: string,
  before?: string,
  limit: number = 20
): Promise<GetMessagesResponse> => {
  try {
    const params: any = { conversationId, limit };
    if (before) {
      params.before = before;
    }
    const response = await api.get<GetMessagesResponse>('/messages', { params });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'Failed to get messages',
      };
    }
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

/**
 * Send a message
 */
export const sendMessage = async (
  data: SendMessageRequest
): Promise<SendMessageResponse> => {
  try {
    const response = await api.post<SendMessageResponse>('/messages/send', data);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'Failed to send message',
      };
    }
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

export interface ConversationMember {
  id: string;
  name: string;
  avatarUrl?: string;
  phone?: string;
}

export interface Conversation {
  id: string;
  type: 'private' | 'group';
  title?: string;
  members: ConversationMember[];
  otherMember?: ConversationMember | null;
  lastMessageAt?: string;
  createdAt: string;
  archived: boolean;
  lastMessage?: {
    text?: string;
    senderName?: string;
    createdAt?: string;
  };
  unreadCount?: number;
}

export interface GetConversationsResponse {
  success: boolean;
  conversations?: Conversation[];
  count?: number;
  error?: string;
}

export interface ArchiveConversationResponse {
  success: boolean;
  archived?: boolean;
  error?: string;
}

/**
 * Get conversations list
 * Note: Backend currently filters out archived conversations.
 * For archived conversations, backend needs to support ?archived=true query param
 */
export const getConversations = async (
  archived: boolean = false
): Promise<GetConversationsResponse> => {
  try {
    // Backend doesn't currently support archived filter
    // This would need backend update: const params = archived ? { archived: 'true' } : {};
    const response = await api.get<GetConversationsResponse>('/conversations');
    
    if (archived) {
      // For now, return empty array - backend needs to support archived filter
      // TODO: Backend should support ?archived=true query param
      return {
        success: true,
        conversations: [],
        count: 0,
      };
    }
    
    return response.data;
  } catch (error: any) {
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'Failed to get conversations',
      };
    }
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

/**
 * Archive or unarchive a conversation
 */
export const archiveConversation = async (
  conversationId: string,
  archive: boolean = true
): Promise<ArchiveConversationResponse> => {
  try {
    const response = await api.patch<ArchiveConversationResponse>(
      `/conversations/${conversationId}/archive`,
      { archive }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'Failed to archive conversation',
      };
    }
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

export default api;

