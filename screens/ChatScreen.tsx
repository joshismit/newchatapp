import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
// Use non-secure nanoid for React Native compatibility (doesn't require crypto)
import { nanoid } from 'nanoid/non-secure';
import { storageService, Message, MessageStatus } from '../services/storage';
import { getMessages, sendMessage as sendMessageAPI, getAuthToken } from '../utils/api';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';

// Conditionally import web-incompatible modules
let NetInfo: any = null;
let sseService: any = null;
let messageQueue: any = null;

if (Platform.OS !== 'web') {
  try {
    NetInfo = require('@react-native-community/netinfo').default;
    sseService = require('../services/sse').sseService;
    messageQueue = require('../services/queue').messageQueue;
  } catch (error) {
    console.warn('Failed to load native modules:', error);
  }
}

interface ChatScreenParams {
  conversationId: string;
  conversationTitle?: string;
  otherMemberName?: string;
}

export default function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { conversationId, conversationTitle, otherMemberName } = (route.params as ChatScreenParams) || {};

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [failedMessages, setFailedMessages] = useState<Set<string>>(new Set());
  const [isOnline, setIsOnline] = useState(true);

  const flatListRef = useRef<FlatList>(null);
  const messagesEndRef = useRef<{ scrollToEnd: () => void } | null>(null);

  // Load current user ID and monitor connectivity
  useEffect(() => {
    const loadUserId = async () => {
      const userId = await storageService.getUserId();
      setCurrentUserId(userId);
    };
    loadUserId();

    // Monitor network connectivity (only on native)
    if (Platform.OS === 'web') {
      setIsOnline(true);
      return;
    }

    if (!NetInfo) {
      setIsOnline(true);
      return;
    }

    const unsubscribeNetInfo = NetInfo.addEventListener((state: any) => {
      const online = state.isConnected ?? false;
      setIsOnline(online);
    });

    return () => {
      unsubscribeNetInfo();
    };
  }, []);

  // Load messages from storage on mount
  useEffect(() => {
    if (conversationId) {
      loadMessages();
    }
  }, [conversationId]);

  // Set up SSE listener for new messages and queue flush
  useEffect(() => {
    const handleNewMessage: SSEEventHandler = (event) => {
      if (event.type === 'message:new' && event.data.message) {
        const message = event.data.message;
        
        // Only handle messages for this conversation
        if (message.conversationId === conversationId) {
          handleIncomingMessage(message);
        }
      } else if (event.type === 'message:status' && event.data.messageId) {
        // Update message status (delivered/read)
        updateMessageStatus(event.data.messageId, event.data.status);
      } else if (event.type === 'connected') {
        // SSE reconnected, flush queue
        console.log('SSE connected, flushing queue...');
        messageQueue.flushQueue();
      }
    };

    sseService.addEventHandler(handleNewMessage);

    // Listen for queue flush completion to update UI
    const handleQueueFlush = () => {
      // Reload messages to reflect status updates
      loadMessages();
    };
    messageQueue.addFlushListener(handleQueueFlush);

    return () => {
      sseService.removeEventHandler(handleNewMessage);
      messageQueue.removeFlushListener(handleQueueFlush);
    };
  }, [conversationId]);

  /**
   * Load messages from local storage and sync with server
   */
  const loadMessages = async () => {
    try {
      setLoading(true);

      // Load from local storage first (for instant display)
      const localMessages = await storageService.loadConversation(conversationId);
      
      // Reverse for inverted FlatList (newest at bottom)
      const reversedMessages = [...localMessages].reverse();
      setMessages(reversedMessages);

      // Fetch latest messages from server
      try {
        const response = await getMessages(conversationId);
        if (response.success && response.messages) {
          // Merge and deduplicate messages
          const serverMessages = response.messages;
          const mergedMessages = mergeMessages(localMessages, serverMessages);
          
          // Save merged messages
          await storageService.saveConversation(conversationId, mergedMessages);
          
          // Reverse for inverted FlatList
          const reversedMerged = [...mergedMessages].reverse();
          setMessages(reversedMerged);
        }
      } catch (error) {
        console.error('Error fetching messages from server:', error);
        // Continue with local messages if server fetch fails
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Merge local and server messages, removing duplicates
   */
  const mergeMessages = (local: Message[], server: Message[]): Message[] => {
    const messageMap = new Map<string, Message>();

    // Add local messages
    local.forEach((msg) => {
      messageMap.set(msg.id, msg);
      if (msg.clientId) {
        messageMap.set(`client_${msg.clientId}`, msg);
      }
    });

    // Add/update with server messages (server takes precedence)
    server.forEach((msg) => {
      messageMap.set(msg.id, msg);
      if (msg.clientId) {
        messageMap.set(`client_${msg.clientId}`, msg);
      }
    });

    const merged = Array.from(messageMap.values());
    merged.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return merged;
  };

  /**
   * Handle incoming message from SSE
   */
  const handleIncomingMessage = async (messageData: any) => {
    const message: Message = {
      id: messageData.id,
      conversationId: messageData.conversationId,
      senderId: messageData.senderId,
      text: messageData.text,
      attachments: messageData.attachments || [],
      clientId: messageData.clientId,
      status: messageData.status || 'sent',
      createdAt: messageData.createdAt,
      deliveredTo: messageData.deliveredTo || [],
      readBy: messageData.readBy || [],
      sender: messageData.sender,
    };

    // Append to local storage
    await storageService.appendMessage(conversationId, message);

    // Update UI (prepend to inverted list)
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === message.id);
      if (!exists) {
        return [message, ...prev];
      }
      return prev;
    });
  };

  /**
   * Update message status
   */
  const updateMessageStatus = async (messageId: string, status: string) => {
    await storageService.updateMessage(conversationId, messageId, {
      status: status as MessageStatus,
    });

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, status: status as MessageStatus } : msg
      )
    );
  };

  /**
   * Send a new message
   */
  const sendMessage = async () => {
    if (!inputText.trim() || sending || !currentUserId) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      // Generate client-side ID for optimistic update
      const clientId = nanoid();

      // Create optimistic message
      const optimisticMessage: Message = {
        id: `temp_${clientId}`,
        conversationId,
        senderId: currentUserId,
        text,
        status: 'sending',
        createdAt: new Date().toISOString(),
        deliveredTo: [],
        readBy: [],
        clientId,
      };

      // Add optimistic message to UI (prepend to inverted list)
      setMessages((prev) => [optimisticMessage, ...prev]);

      // Save optimistic message to storage
      await storageService.appendMessage(conversationId, optimisticMessage);

      // Check if online
      const netInfo = Platform.OS === 'web' ? { isConnected: true } : (NetInfo ? await NetInfo.fetch() : { isConnected: true });
      const online = netInfo.isConnected ?? false;

      if (!online) {
        // Queue message for later sending
        console.log('Offline: Queueing message for later');
        await messageQueue.queueOutgoing(optimisticMessage);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticMessage.id ? { ...msg, status: 'queued' } : msg
          )
        );
        setSending(false);
        return;
      }

      // Get auth token
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No auth token available');
      }

      // Send to server
      const response = await sendMessageAPI({
        conversationId,
        text,
        clientId,
      });

      if (response.success && response.message) {
        // Replace optimistic message with server response
        const serverMessage: Message = {
          id: response.message.id,
          conversationId: response.message.conversationId,
          senderId: response.message.senderId,
          text: response.message.text,
          attachments: response.message.attachments || [],
          clientId: response.message.clientId,
          status: response.message.status,
          createdAt: response.message.createdAt,
          deliveredTo: response.message.deliveredTo,
          readBy: response.message.readBy,
        };

        // Remove optimistic message and add server message
        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== optimisticMessage.id);
          return [serverMessage, ...filtered];
        });

        // Update storage - remove optimistic and add server message
        const currentMessages = await storageService.loadConversation(conversationId);
        const filtered = currentMessages.filter((m) => m.id !== optimisticMessage.id);
        await storageService.saveConversation(conversationId, [...filtered, serverMessage]);

        // Remove from failed set if it was there
        setFailedMessages((prev) => {
          const next = new Set(prev);
          next.delete(optimisticMessage.id);
          return next;
        });
      } else {
        // Mark as failed
        await storageService.updateMessage(conversationId, optimisticMessage.id, {
          status: 'failed',
        });
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticMessage.id
              ? { ...msg, status: 'failed' }
              : msg
          )
        );
        setFailedMessages((prev) => new Set(prev).add(optimisticMessage.id));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Mark optimistic message as failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id?.startsWith('temp_') ? { ...msg, status: 'failed' } : msg
        )
      );
      // Find and mark failed messages
      const failedId = messages.find((m) => m.id?.startsWith('temp_'))?.id;
      if (failedId) {
        await storageService.updateMessage(conversationId, failedId, {
          status: 'failed',
        });
        setFailedMessages((prev) => new Set(prev).add(failedId));
      }
    } finally {
      setSending(false);
    }
  };

  /**
   * Retry sending a failed message
   */
  const retryMessage = useCallback(async (message: Message) => {
    if (!message.text || !currentUserId) return;

    setSending(true);

    try {
      // Check if online
      const netInfo = Platform.OS === 'web' ? { isConnected: true } : (NetInfo ? await NetInfo.fetch() : { isConnected: true });
      const online = netInfo.isConnected ?? false;

      // Update status
      const newStatus = online ? 'sending' : 'queued';
      await storageService.updateMessage(conversationId, message.id, {
        status: newStatus,
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id ? { ...msg, status: newStatus } : msg
        )
      );

      if (!online) {
        // Queue message for later sending
        console.log('Offline: Queueing message for later');
        await messageQueue.queueOutgoing({
          ...message,
          status: 'queued',
        });
        setSending(false);
        return;
      }

      // Get auth token
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No auth token available');
      }

      // Send to server
      const response = await sendMessageAPI({
        conversationId,
        text: message.text,
        clientId: message.clientId,
      });

      if (response.success && response.message) {
        // Replace with server message
        const serverMessage: Message = {
          id: response.message.id,
          conversationId: response.message.conversationId,
          senderId: response.message.senderId,
          text: response.message.text,
          attachments: response.message.attachments || [],
          clientId: response.message.clientId,
          status: response.message.status,
          createdAt: response.message.createdAt,
          deliveredTo: response.message.deliveredTo,
          readBy: response.message.readBy,
        };

        // Update in UI
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === message.id ? serverMessage : msg
          )
        );

        // Update storage
        await storageService.updateMessage(conversationId, message.id, serverMessage);

        // Remove from failed set
        setFailedMessages((prev) => {
          const next = new Set(prev);
          next.delete(message.id);
          return next;
        });
      } else {
        throw new Error(response.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error retrying message:', error);
      // Mark as failed again
      await storageService.updateMessage(conversationId, message.id, {
        status: 'failed',
      });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id ? { ...msg, status: 'failed' } : msg
        )
      );
    } finally {
      setSending(false);
    }
  }, [conversationId, currentUserId]);

  /**
   * Render message item
   */
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isOwn = item.senderId === currentUserId;
      return (
        <MessageBubble
          message={item}
          isOwn={isOwn}
          onRetry={item.status === 'failed' ? retryMessage : undefined}
        />
      );
    },
    [currentUserId, retryMessage]
  );

  /**
   * Get message key
   */
  const getMessageKey = useCallback((item: Message) => {
    return item.id || item.clientId || `msg_${item.createdAt}`;
  }, []);

  /**
   * Handle attach button
   */
  const handleAttach = () => {
    // TODO: Implement attachment picker
    console.log('Attach button pressed');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {conversationTitle || otherMemberName || 'Chat'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#25D366" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {conversationTitle || otherMemberName || 'Chat'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={getMessageKey}
        inverted
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={15}
        windowSize={10}
        onContentSizeChange={() => {
          // Auto-scroll to bottom on new messages (inverted list)
        }}
      />

      {/* Input Area */}
      <ChatInput
        value={inputText}
        onChangeText={setInputText}
        onSend={sendMessage}
        onAttach={handleAttach}
        sending={sending}
        disabled={!currentUserId}
      />
    </KeyboardAvoidingView>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MOBILE_MARGIN = SCREEN_HEIGHT * 0.05; // 5% of screen height

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        marginTop: MOBILE_MARGIN,
        marginBottom: MOBILE_MARGIN,
      },
      android: {
        marginTop: MOBILE_MARGIN,
        marginBottom: MOBILE_MARGIN,
      },
      web: {
        marginTop: 0,
        marginBottom: 0,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        paddingTop: 50,
      },
    }),
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  headerSpacer: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  messagesList: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
});
