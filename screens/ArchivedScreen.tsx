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
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getConversations, archiveConversation, Conversation } from '../utils/api';
import ConversationItem from '../components/ConversationItem';
import { storageService } from '../services/storage';

export default function ArchivedScreen() {
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

  // Load archived conversations on mount and when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadArchivedConversations();
    }, [])
  );

  /**
   * Load archived conversations from server
   */
  const loadArchivedConversations = async () => {
    try {
      setLoading(true);
      // Note: Backend needs to support archived=true query param
      // For now, we'll fetch all and filter, or implement backend endpoint
      const response = await getConversations(true); // true = archived

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
              unreadCount: 0,
            };
          })
        );

        setConversations(conversationsWithLastMessage);
      } else {
        // If backend doesn't support archived filter, show empty
        setConversations([]);
      }
    } catch (error: any) {
      console.error('Error loading archived conversations:', error);
      setConversations([]);
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
    loadArchivedConversations();
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
   * Handle long press - show unarchive option
   */
  const handleLongPress = (conversation: Conversation) => {
    Alert.alert(
      conversation.title || conversation.otherMember?.name || 'Conversation',
      'Unarchive this conversation?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unarchive',
          onPress: () => unarchiveConversationHandler(conversation.id),
        },
      ]
    );
  };

  /**
   * Unarchive conversation
   */
  const unarchiveConversationHandler = async (conversationId: string) => {
    try {
      const response = await archiveConversation(conversationId, false);

      if (response.success) {
        // Remove from list
        setConversations((prev) =>
          prev.filter((conv) => conv.id !== conversationId)
        );
        Alert.alert('Success', 'Conversation unarchived');
      } else {
        Alert.alert('Error', response.error || 'Failed to unarchive conversation');
      }
    } catch (error: any) {
      console.error('Error unarchiving conversation:', error);
      Alert.alert('Error', 'Failed to unarchive conversation');
    }
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Archived</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Conversations List */}
      {loading && conversations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#25D366" />
          <Text style={styles.loadingText}>Loading archived conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={getConversationKey}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="archive-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No archived conversations</Text>
              <Text style={styles.emptySubtext}>
                Long-press a conversation to archive it
              </Text>
            </View>
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={15}
          windowSize={10}
        />
      )}
    </View>
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
    fontSize: 20,
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
});

