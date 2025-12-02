import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const CONVERSATIONS_KEY = 'conversations';
const MESSAGES_PREFIX = 'messages_';
const TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'user_id';

// Type definitions matching backend models
export interface MessageAttachment {
  type: string;
  url: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'queued';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string;
  attachments?: MessageAttachment[];
  clientId?: string;
  status: MessageStatus;
  createdAt: string; // ISO string
  deliveredTo: string[];
  readBy: string[];
  sender?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export type ConversationType = 'private' | 'group';

export interface Conversation {
  id: string;
  type: ConversationType;
  title?: string;
  members: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
    phone?: string;
  }>;
  otherMember?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  lastMessageAt?: string; // ISO string
  createdAt: string; // ISO string
  archived: boolean;
}

interface ConversationListItem {
  id: string;
  lastMessageAt?: string;
  updatedAt: string;
}

class StorageService {
  /**
   * Save conversation with messages
   */
  saveConversation = async (
    conversationId: string,
    messages: Message[]
  ): Promise<void> => {
    try {
      const key = `${MESSAGES_PREFIX}${conversationId}`;
      await AsyncStorage.setItem(key, JSON.stringify(messages));

      // Update conversation list
      await this.updateConversationList(conversationId, messages);
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  };

  /**
   * Load messages for a conversation
   */
  loadConversation = async (conversationId: string): Promise<Message[]> => {
    try {
      const key = `${MESSAGES_PREFIX}${conversationId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading conversation:', error);
      return [];
    }
  };

  /**
   * Append a message to a conversation
   */
  appendMessage = async (
    conversationId: string,
    message: Message
  ): Promise<void> => {
    try {
      const messages = await this.loadConversation(conversationId);

      // Check if message already exists (by id or clientId)
      const exists = messages.some(
        (m) => m.id === message.id || m.clientId === message.clientId
      );

      if (!exists) {
        messages.push(message);
        // Sort by createdAt (oldest first)
        messages.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        await this.saveConversation(conversationId, messages);
      }
    } catch (error) {
      console.error('Error appending message:', error);
      throw error;
    }
  };

  /**
   * Update existing message (e.g., status update)
   * Can accept partial updates or full message replacement
   */
  updateMessage = async (
    conversationId: string,
    messageId: string,
    updates: Partial<Message> | Message
  ): Promise<void> => {
    try {
      const messages = await this.loadConversation(conversationId);
      const index = messages.findIndex((m) => m.id === messageId);

      if (index !== -1) {
        // If updates is a full Message object with matching id, replace it
        if ('id' in updates && updates.id === messageId) {
          messages[index] = updates as Message;
        } else {
          // Otherwise merge partial updates
          messages[index] = { ...messages[index], ...updates };
        }
        await this.saveConversation(conversationId, messages);
      } else {
        // If message not found, it might be an optimistic message - try to find by clientId
        const optimisticIndex = messages.findIndex(
          (m) => m.id === messageId || m.clientId === (updates as any).clientId
        );
        if (optimisticIndex !== -1) {
          if ('id' in updates && updates.id) {
            messages[optimisticIndex] = updates as Message;
          } else {
            messages[optimisticIndex] = { ...messages[optimisticIndex], ...updates };
          }
          await this.saveConversation(conversationId, messages);
        }
      }
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  };

  /**
   * Get list of conversations (for quick access)
   */
  getConversationsList = async (): Promise<ConversationListItem[]> => {
    try {
      const data = await AsyncStorage.getItem(CONVERSATIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting conversations list:', error);
      return [];
    }
  };

  /**
   * Save conversation metadata to list
   */
  saveConversationMetadata = async (
    conversation: Conversation
  ): Promise<void> => {
    try {
      const list = await this.getConversationsList();
      const index = list.findIndex((item) => item.id === conversation.id);

      const listItem: ConversationListItem = {
        id: conversation.id,
        lastMessageAt: conversation.lastMessageAt,
        updatedAt: conversation.lastMessageAt || conversation.createdAt,
      };

      if (index !== -1) {
        list[index] = listItem;
      } else {
        list.push(listItem);
      }

      // Sort by updatedAt (most recent first)
      list.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(list));
    } catch (error) {
      console.error('Error saving conversation metadata:', error);
    }
  };

  /**
   * Update conversation list with latest message timestamp
   */
  private updateConversationList = async (
    conversationId: string,
    messages: Message[]
  ): Promise<void> => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const list = await this.getConversationsList();
    const index = list.findIndex((item) => item.id === conversationId);

    const listItem: ConversationListItem = {
      id: conversationId,
      lastMessageAt: lastMessage.createdAt,
      updatedAt: lastMessage.createdAt,
    };

    if (index !== -1) {
      list[index] = listItem;
    } else {
      list.push(listItem);
    }

    // Sort by updatedAt (most recent first)
    list.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(list));
  };

  /**
   * Save auth token
   */
  saveToken = async (token: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving token:', error);
      throw error;
    }
  };

  /**
   * Get auth token
   */
  getToken = async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };

  /**
   * Remove auth token
   */
  removeToken = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  };

  /**
   * Save user ID
   */
  saveUserId = async (userId: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(USER_ID_KEY, userId);
    } catch (error) {
      console.error('Error saving user ID:', error);
      throw error;
    }
  };

  /**
   * Get user ID
   */
  getUserId = async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(USER_ID_KEY);
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  };

  /**
   * Remove user ID
   */
  removeUserId = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(USER_ID_KEY);
    } catch (error) {
      console.error('Error removing user ID:', error);
    }
  };

  /**
   * Clear all stored data
   */
  clearAll = async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const messageKeys = keys.filter((key) => key.startsWith(MESSAGES_PREFIX));
      const allKeys = [
        CONVERSATIONS_KEY,
        TOKEN_KEY,
        USER_ID_KEY,
        ...messageKeys,
      ];
      await AsyncStorage.multiRemove(allKeys);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  /**
   * Get storage size estimate (for debugging)
   */
  getStorageSize = async (): Promise<number> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      return items.reduce((size, [, value]) => {
        return size + (value ? value.length : 0);
      }, 0);
    } catch (error) {
      console.error('Error getting storage size:', error);
      return 0;
    }
  };
}

// Export singleton instance
export const storageService = new StorageService();

