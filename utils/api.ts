import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Determine API URL based on platform
// For Android emulator, use 10.0.2.2 instead of localhost
// For iOS simulator, localhost works
// For physical devices, use your computer's IP address
const getDefaultAPIUrl = () => {
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    return 'http://10.0.2.2:3000';
  }
  // iOS simulator and web can use localhost
  return 'http://localhost:3000';
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || getDefaultAPIUrl();

// Log API URL for debugging
console.log('API Base URL:', API_BASE_URL);

// Create axios instance with timeout
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
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

export interface SendOTPRequest {
  phone: string;
}

export interface SendOTPResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface VerifyOTPRequest {
  phone: string;
  otp: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    name: string;
    phone: string;
    avatarUrl?: string | null;
  };
  error?: string;
}

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

export interface SyncMessagesResponse {
  success: boolean;
  conversations: Array<{
    conversationId: string;
    messages: Array<{
      id: string;
      conversationId: string;
      senderId: string;
      receiverId: string;
      content: string;
      type: string;
      status: string;
      timestamp: string;
      sender?: {
        id: string;
        name: string;
        avatarUrl?: string;
      };
    }>;
    lastMessageAt?: string;
  }>;
  count?: number;
  error?: string;
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
 * Send OTP to phone number
 */
export const sendOTP = async (phone: string): Promise<SendOTPResponse> => {
  try {
    console.log('Attempting to send OTP to:', API_BASE_URL);
    const response = await api.post<SendOTPResponse>('/auth/send-otp', {
      phone,
    });
    return response.data;
  } catch (error: any) {
    console.error('Send OTP API error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      url: `${API_BASE_URL}/auth/send-otp`,
    });
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message?.includes('Network Error')) {
      return {
        success: false,
        error: `Cannot connect to server at ${API_BASE_URL}. Please ensure the backend server is running and the API URL is correct.`,
      };
    }
    
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'Failed to send OTP',
      };
    }
    return {
      success: false,
      error: error.message || 'Network error. Please check your connection.',
    };
  }
};

/**
 * Verify OTP and login
 */
export const verifyOTP = async (phone: string, otp: string): Promise<VerifyOTPResponse> => {
  try {
    console.log('Attempting to verify OTP:', API_BASE_URL);
    const response = await api.post<VerifyOTPResponse>('/auth/verify-otp', {
      phone,
      otp,
    });
    return response.data;
  } catch (error: any) {
    console.error('Verify OTP API error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      url: `${API_BASE_URL}/auth/verify-otp`,
    });
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message?.includes('Network Error')) {
      return {
        success: false,
        error: `Cannot connect to server at ${API_BASE_URL}. Please ensure the backend server is running and the API URL is correct.`,
      };
    }
    
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'Failed to verify OTP',
      };
    }
    return {
      success: false,
      error: error.message || 'Network error. Please check your connection.',
    };
  }
};

/**
 * Scan QR code and authorize desktop login (Mobile only)
 * 
 * Requirements:
 * - Mobile must be authenticated (JWT token in Authorization header)
 * - QR token (UUID) from scanned QR code
 * - Backend creates desktop session token (long-lived)
 */
export const scanQRCode = async (
  token: string,
  userId?: string // Not used - userId comes from JWT token in Authorization header
): Promise<QRScanResponse> => {
  try {
    // Send QR token (UUID) to backend
    // Backend extracts userId from JWT token (authentication middleware)
    // This ensures only authenticated mobile devices can authorize desktop sessions
    const response = await api.post<QRScanResponse>('/auth/qr-scan', {
      token, // UUID token from QR code
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

export interface User {
  id: string;
  name: string;
  phone: string;
  avatarUrl?: string | null;
}

export interface SearchUsersResponse {
  success: boolean;
  users?: User[];
  error?: string;
}

/**
 * Search for users by phone number
 */
export const searchUsers = async (phone: string): Promise<SearchUsersResponse> => {
  try {
    const response = await api.get<SearchUsersResponse>('/auth/users/search', {
      params: { phone },
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'Failed to search users',
      };
    }
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

export interface CreateConversationRequest {
  type?: 'private' | 'group';
  title?: string;
  memberIds: string[];
}

export interface CreateConversationResponse {
  success: boolean;
  conversation?: Conversation;
  alreadyExists?: boolean;
  error?: string;
}

/**
 * Sync recent messages for desktop (WhatsApp-like initial sync)
 * Returns recent messages from all conversations
 */
export const syncMessages = async (
  limit?: number,
  days?: number
): Promise<SyncMessagesResponse> => {
  try {
    const params: any = {};
    if (limit) params.limit = limit;
    if (days) params.days = days;
    
    const response = await api.get<SyncMessagesResponse>('/auth/sync-messages', {
      params,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      return {
        success: false,
        conversations: [],
        error: error.response.data?.error || 'Failed to sync messages',
      };
    }
    return {
      success: false,
      conversations: [],
      error: error.message || 'Network error',
    };
  }
};

/**
 * Create a new conversation
 */
export const createConversation = async (
  data: CreateConversationRequest
): Promise<CreateConversationResponse> => {
  try {
    const response = await api.post<CreateConversationResponse>('/conversations', data);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.error || 'Failed to create conversation',
      };
    }
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

export default api;

