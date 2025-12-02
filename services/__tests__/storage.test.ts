// Mock AsyncStorage BEFORE importing storage service
const mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockStorage))),
  multiGet: jest.fn((keys: string[]) =>
    Promise.resolve(keys.map((key) => [key, mockStorage[key] || null]))
  ),
  multiRemove: jest.fn((keys: string[]) => {
    keys.forEach((key) => delete mockStorage[key]);
    return Promise.resolve();
  }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageService, Message, Conversation } from '../storage';

describe('StorageService', () => {
  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('saveConversation', () => {
    it('should save messages for a conversation', async () => {
      const conversationId = 'conv123';
      const messages: Message[] = [
        {
          id: 'msg1',
          conversationId,
          senderId: 'user1',
          text: 'Hello',
          status: 'sent',
          createdAt: '2024-01-01T00:00:00Z',
          deliveredTo: [],
          readBy: [],
        },
      ];

      await storageService.saveConversation(conversationId, messages);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'messages_conv123',
        JSON.stringify(messages)
      );
    });

    it('should update conversation list when saving messages', async () => {
      const conversationId = 'conv123';
      const messages: Message[] = [
        {
          id: 'msg1',
          conversationId,
          senderId: 'user1',
          text: 'Hello',
          status: 'sent',
          createdAt: '2024-01-01T00:00:00Z',
          deliveredTo: [],
          readBy: [],
        },
      ];

      await storageService.saveConversation(conversationId, messages);

      // Should also update conversations list
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'conversations',
        expect.any(String)
      );
    });
  });

  describe('loadConversation', () => {
    it('should load messages for a conversation', async () => {
      const conversationId = 'conv123';
      const messages: Message[] = [
        {
          id: 'msg1',
          conversationId,
          senderId: 'user1',
          text: 'Hello',
          status: 'sent',
          createdAt: '2024-01-01T00:00:00Z',
          deliveredTo: [],
          readBy: [],
        },
      ];

      // Set up mock storage
      mockStorage[`messages_${conversationId}`] = JSON.stringify(messages);

      const result = await storageService.loadConversation(conversationId);

      expect(result).toEqual(messages);
    });

    it('should return empty array if no messages found', async () => {
      const conversationId = 'conv123';
      // Ensure no messages in storage
      delete mockStorage[`messages_${conversationId}`];

      const result = await storageService.loadConversation(conversationId);

      expect(result).toEqual([]);
    });

    it('should handle JSON parse errors gracefully', async () => {
      const conversationId = 'conv123';
      // Set invalid JSON in storage
      mockStorage[`messages_${conversationId}`] = 'invalid json';

      const result = await storageService.loadConversation(conversationId);

      expect(result).toEqual([]);
    });
  });

  describe('appendMessage', () => {
    it('should append a new message to conversation', async () => {
      const conversationId = 'conv123';
      const existingMessages: Message[] = [
        {
          id: 'msg1',
          conversationId,
          senderId: 'user1',
          text: 'Hello',
          status: 'sent',
          createdAt: '2024-01-01T00:00:00Z',
          deliveredTo: [],
          readBy: [],
        },
      ];

      const newMessage: Message = {
        id: 'msg2',
        conversationId,
        senderId: 'user2',
        text: 'Hi there',
        status: 'sent',
        createdAt: '2024-01-01T00:01:00Z',
        deliveredTo: [],
        readBy: [],
      };

      // Set up mock storage with existing messages
      mockStorage[`messages_${conversationId}`] = JSON.stringify(existingMessages);

      await storageService.appendMessage(conversationId, newMessage);

      // Verify message was saved
      const savedData = mockStorage[`messages_${conversationId}`];
      expect(savedData).toBeDefined();
      const savedMessages = JSON.parse(savedData);
      // Messages are sorted by createdAt (oldest first), so msg1 should be first, msg2 second
      expect(savedMessages.length).toBe(2);
      expect(savedMessages.some((m: Message) => m.id === 'msg2')).toBe(true);
      expect(savedMessages.some((m: Message) => m.id === 'msg1')).toBe(true);
    });

    it('should not append duplicate messages (by id)', async () => {
      const conversationId = 'conv123';
      const existingMessages: Message[] = [
        {
          id: 'msg1',
          conversationId,
          senderId: 'user1',
          text: 'Hello',
          status: 'sent',
          createdAt: '2024-01-01T00:00:00Z',
          deliveredTo: [],
          readBy: [],
        },
      ];

      // Set up mock storage with existing messages
      mockStorage[`messages_${conversationId}`] = JSON.stringify(existingMessages);

      await storageService.appendMessage(conversationId, existingMessages[0]);

      // Should not add duplicate
      const savedData = mockStorage[`messages_${conversationId}`];
      const savedMessages = JSON.parse(savedData);
      expect(savedMessages.length).toBe(1);
    });

    it('should not append duplicate messages (by clientId)', async () => {
      const conversationId = 'conv123';
      const clientId = 'client123';
      const existingMessages: Message[] = [
        {
          id: 'msg1',
          conversationId,
          senderId: 'user1',
          text: 'Hello',
          status: 'sent',
          createdAt: '2024-01-01T00:00:00Z',
          deliveredTo: [],
          readBy: [],
          clientId,
        },
      ];

      const newMessage: Message = {
        id: 'msg2',
        conversationId,
        senderId: 'user1',
        text: 'Hello',
        status: 'sent',
        createdAt: '2024-01-01T00:01:00Z',
        deliveredTo: [],
        readBy: [],
        clientId, // Same clientId
      };

      // Set up mock storage with existing messages
      mockStorage[`messages_${conversationId}`] = JSON.stringify(existingMessages);

      await storageService.appendMessage(conversationId, newMessage);

      // Should not add duplicate (same clientId)
      const savedData = mockStorage[`messages_${conversationId}`];
      const savedMessages = JSON.parse(savedData);
      expect(savedMessages.length).toBe(1);
    });
  });

  describe('updateMessage', () => {
    it('should update message status', async () => {
      const conversationId = 'conv123';
      const messages: Message[] = [
        {
          id: 'msg1',
          conversationId,
          senderId: 'user1',
          text: 'Hello',
          status: 'sent',
          createdAt: '2024-01-01T00:00:00Z',
          deliveredTo: [],
          readBy: [],
        },
      ];

      // Set up mock storage
      mockStorage[`messages_${conversationId}`] = JSON.stringify(messages);

      await storageService.updateMessage(conversationId, 'msg1', {
        status: 'delivered',
      });

      // Verify update
      const savedData = mockStorage[`messages_${conversationId}`];
      const savedMessages = JSON.parse(savedData);
      expect(savedMessages[0].status).toBe('delivered');
    });

    it('should handle full message replacement', async () => {
      const conversationId = 'conv123';
      const messages: Message[] = [
        {
          id: 'msg1',
          conversationId,
          senderId: 'user1',
          text: 'Hello',
          status: 'sent',
          createdAt: '2024-01-01T00:00:00Z',
          deliveredTo: [],
          readBy: [],
        },
      ];

      const updatedMessage: Message = {
        id: 'msg1',
        conversationId,
        senderId: 'user1',
        text: 'Hello Updated',
        status: 'read',
        createdAt: '2024-01-01T00:00:00Z',
        deliveredTo: ['user2'],
        readBy: ['user2'],
      };

      // Set up mock storage
      mockStorage[`messages_${conversationId}`] = JSON.stringify(messages);

      await storageService.updateMessage(conversationId, 'msg1', updatedMessage);

      // Verify update
      const savedData = mockStorage[`messages_${conversationId}`];
      const savedMessages = JSON.parse(savedData);
      expect(savedMessages[0].text).toBe('Hello Updated');
      expect(savedMessages[0].status).toBe('read');
    });
  });

  describe('getConversationsList', () => {
    it('should return conversation list', async () => {
      const list = [
        {
          id: 'conv123',
          lastMessageAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      // Set up mock storage
      mockStorage['conversations'] = JSON.stringify(list);

      const result = await storageService.getConversationsList();

      expect(result).toEqual(list);
    });

    it('should return empty array if no conversations', async () => {
      // Ensure conversations key doesn't exist
      if (mockStorage['conversations']) {
        delete mockStorage['conversations'];
      }

      const result = await storageService.getConversationsList();

      expect(result).toEqual([]);
    });
  });

  describe('Token management', () => {
    it('should save and retrieve token', async () => {
      const token = 'jwt_token_123';

      await storageService.saveToken(token);

      const result = await storageService.getToken();

      expect(mockStorage['auth_token']).toBe(token);
      expect(result).toBe(token);
    });

    it('should remove token', async () => {
      // Set token first
      mockStorage['auth_token'] = 'test_token';
      
      await storageService.removeToken();

      expect(mockStorage['auth_token']).toBeUndefined();
    });
  });

  describe('User ID management', () => {
    it('should save and retrieve user ID', async () => {
      const userId = 'user123';

      await storageService.saveUserId(userId);

      const result = await storageService.getUserId();

      expect(mockStorage['user_id']).toBe(userId);
      expect(result).toBe(userId);
    });
  });

  describe('clearAll', () => {
    it('should clear all stored data', async () => {
      // Set up some data
      mockStorage['messages_conv1'] = '[]';
      mockStorage['messages_conv2'] = '[]';
      mockStorage['conversations'] = '[]';
      mockStorage['auth_token'] = 'token';
      mockStorage['user_id'] = 'user123';

      await storageService.clearAll();

      // Verify all keys are removed
      expect(mockStorage['conversations']).toBeUndefined();
      expect(mockStorage['auth_token']).toBeUndefined();
      expect(mockStorage['user_id']).toBeUndefined();
      expect(mockStorage['messages_conv1']).toBeUndefined();
      expect(mockStorage['messages_conv2']).toBeUndefined();
    });
  });
});

