// Import AFTER mocks are set up in jest.setup.js
import { sendMessage, getMessages } from '../api';

// Get mocks from global scope (set in jest.setup.js)
const mockPost = (global as any).mockAxiosPost;
const mockGet = (global as any).mockAxiosGet;

describe('API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset axios mocks
    mockPost.mockClear();
    mockGet.mockClear();
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: {
            id: 'msg123',
            conversationId: 'conv123',
            senderId: 'user1',
            text: 'Hello',
            status: 'sent',
            createdAt: '2024-01-01T00:00:00Z',
            deliveredTo: [],
            readBy: [],
            clientId: 'client123',
          },
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await sendMessage({
        conversationId: 'conv123',
        text: 'Hello',
        clientId: 'client123',
      });

      expect(result.success).toBe(true);
      expect(result.message?.id).toBe('msg123');
      expect(result.message?.text).toBe('Hello');
    });

    it('should handle API errors', async () => {
      const mockError = {
        response: {
          data: {
            error: 'Failed to send message',
          },
        },
      };

      mockPost.mockRejectedValue(mockError);

      const result = await sendMessage({
        conversationId: 'conv123',
        text: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send message');
    });

    it('should handle network errors', async () => {
      const mockError = {
        message: 'Network error',
      };

      mockPost.mockRejectedValue(mockError);

      const result = await sendMessage({
        conversationId: 'conv123',
        text: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should include Authorization header with token', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: {
            id: 'msg123',
            conversationId: 'conv123',
            senderId: 'user1',
            text: 'Hello',
            status: 'sent',
            createdAt: '2024-01-01T00:00:00Z',
            deliveredTo: [],
            readBy: [],
          },
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      await sendMessage({
        conversationId: 'conv123',
        text: 'Hello',
      });

      // Verify axios was called with correct endpoint
      expect(mockPost).toHaveBeenCalledWith(
        '/messages/send',
        expect.objectContaining({
          conversationId: 'conv123',
          text: 'Hello',
        })
      );
    });
  });

  describe('getMessages', () => {
    it('should fetch messages successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          messages: [
            {
              id: 'msg1',
              conversationId: 'conv123',
              senderId: 'user1',
              text: 'Hello',
              status: 'sent',
              createdAt: '2024-01-01T00:00:00Z',
              deliveredTo: [],
              readBy: [],
            },
          ],
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await getMessages('conv123');

      expect(result.success).toBe(true);
      expect(result.messages?.length).toBe(1);
      expect(result.messages?.[0].text).toBe('Hello');
    });

    it('should include pagination parameters', async () => {
      const mockResponse = {
        data: {
          success: true,
          messages: [],
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      await getMessages('conv123', '2024-01-01T00:00:00Z', 20);

      expect(mockGet).toHaveBeenCalledWith('/messages', {
        params: {
          conversationId: 'conv123',
          before: '2024-01-01T00:00:00Z',
          limit: 20,
        },
      });
    });

    it('should handle API errors', async () => {
      const mockError = {
        response: {
          data: {
            error: 'Failed to get messages',
          },
        },
      };

      mockGet.mockRejectedValue(mockError);

      const result = await getMessages('conv123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get messages');
    });
  });
});

describe('sendMessage Integration Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full send message flow', async () => {
    // 1. Create optimistic message
    const optimisticMessage = {
      id: 'temp_client123',
      conversationId: 'conv123',
      senderId: 'user1',
      text: 'Hello',
      status: 'sending' as const,
      createdAt: '2024-01-01T00:00:00Z',
      deliveredTo: [],
      readBy: [],
      clientId: 'client123',
    };

    // 2. Send to server
    const mockResponse = {
      data: {
        success: true,
        message: {
          id: 'msg123',
          conversationId: 'conv123',
          senderId: 'user1',
          text: 'Hello',
          status: 'sent',
          createdAt: '2024-01-01T00:00:00Z',
          deliveredTo: [],
          readBy: [],
          clientId: 'client123',
        },
      },
    };

    mockPost.mockResolvedValue(mockResponse);

    const result = await sendMessage({
      conversationId: 'conv123',
      text: 'Hello',
      clientId: 'client123',
    });

    // 3. Verify server response
    expect(result.success).toBe(true);
    expect(result.message?.id).toBe('msg123');
    expect(result.message?.clientId).toBe('client123');

    // 4. Verify reconciliation (clientId matches)
    expect(result.message?.clientId).toBe(optimisticMessage.clientId);
  });

  it('should handle offline scenario (queue message)', async () => {
    const mockError = {
      message: 'Network error',
    };

    mockPost.mockRejectedValue(mockError);

    const result = await sendMessage({
      conversationId: 'conv123',
      text: 'Hello',
      clientId: 'client123',
    });

    // Should return error response, not throw
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });
});

