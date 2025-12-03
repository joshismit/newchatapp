import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getConversations, archiveConversation, Conversation } from '../utils/api';
import ConversationItem from '../components/ConversationItem';
import { storageService } from '../services/storage';

// Conditionally import SSE (not available on web)
let sseService: any = null;
let SSEEventHandler: any = null;

if (Platform.OS !== 'web') {
  try {
    const sseModule = require('../services/sse');
    sseService = sseModule.sseService;
    SSEEventHandler = sseModule.SSEEventHandler;
  } catch (error) {
    console.warn('SSE service not available:', error);
  }
}

export default function ConversationsListScreen() {
  const navigation = useNavigation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load current user ID
  useEffect(() => {
    const loadUserId = async () => {
      const userId = await storageService.getUserId();
      setCurrentUserId(userId);
    };
    loadUserId();
  }, []);

  // Load conversations on mount and when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [])
  );

  // Set up SSE listener for conversation updates
  useEffect(() => {
    const handleConversationUpdate: SSEEventHandler = (event) => {
      if (
        event.type === 'conversation:new' ||
        event.type === 'conversation:updated' ||
        event.type === 'message:new'
      ) {
        // Reload conversations when new conversation or message arrives
        loadConversations();
      }
    };

    if (sseService && Platform.OS !== 'web') {
      sseService.addEventHandler(handleConversationUpdate);

      return () => {
        sseService.removeEventHandler(handleConversationUpdate);
      };
    }
  }, []);

  /**
   * Load conversations from server
   */
  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await getConversations(false); // false = not archived

      if (response.success && response.conversations) {
        // Fetch last messages for each conversation from storage
        const conversationsWithLastMessage = await Promise.all(
          response.conversations.map(async (conv) => {
            const messages = await storageService.loadConversation(conv.id);
            const lastMessage = messages[messages.length - 1];

            return {
              ...conv,
              lastMessage: lastMessage
                ? {
                    text: lastMessage.text,
                    senderName: lastMessage.sender?.name,
                    createdAt: lastMessage.createdAt,
                  }
                : undefined,
              unreadCount: 0, // TODO: Calculate unread count
            };
          })
        );

        setConversations(conversationsWithLastMessage);
      } else {
        Alert.alert('Error', response.error || 'Failed to load conversations');
      }
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Handle pull to refresh
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConversations();
  }, []);

  /**
   * Handle conversation press - navigate to ChatScreen
   */
  const handleConversationPress = (conversation: Conversation) => {
    navigation.navigate('Chat' as any, {
      conversationId: conversation.id,
      conversationTitle: conversation.title || conversation.otherMember?.name,
      otherMemberName: conversation.otherMember?.name,
    });
  };

  /**
   * Handle long press - show archive option
   */
  const handleLongPress = (conversation: Conversation) => {
    Alert.alert(
      conversation.title || conversation.otherMember?.name || 'Conversation',
      'Archive this conversation?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => archiveConversationHandler(conversation.id),
        },
      ]
    );
  };

  /**
   * Archive conversation
   */
  const archiveConversationHandler = async (conversationId: string) => {
    try {
      const response = await archiveConversation(conversationId, true);

      if (response.success) {
        // Remove from list
        setConversations((prev) =>
          prev.filter((conv) => conv.id !== conversationId)
        );
      } else {
        Alert.alert('Error', response.error || 'Failed to archive conversation');
      }
    } catch (error: any) {
      console.error('Error archiving conversation:', error);
      Alert.alert('Error', 'Failed to archive conversation');
    }
  };

  /**
   * Navigate to archived conversations
   */
  const navigateToArchived = () => {
    navigation.navigate('Archived' as any);
  };

  /**
   * Navigate to new conversation screen
   */
  const navigateToNewConversation = () => {
    navigation.navigate('NewConversation' as any);
  };

  /**
   * Render conversation item
   */
  const renderConversation = useCallback(
    ({ item }: { item: Conversation }) => (
      <ConversationItem
        conversation={item}
        onPress={() => handleConversationPress(item)}
        onLongPress={() => handleLongPress(item)}
        currentUserId={currentUserId || undefined}
      />
    ),
    [currentUserId]
  );

  /**
   * Get conversation key
   */
  const getConversationKey = useCallback((item: Conversation) => item.id, []);

  if (loading && conversations.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chats</Text>
          <TouchableOpacity onPress={navigateToArchived}>
            <Ionicons name="archive-outline" size={24} color="#25D366" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#25D366" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity onPress={navigateToArchived}>
          <Ionicons name="archive-outline" size={24} color="#25D366" />
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={getConversationKey}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>
              Start a new conversation to get started
            </Text>
          </View>
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={15}
        windowSize={10}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={navigateToNewConversation}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubble" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
      },
    }),
  },
});

