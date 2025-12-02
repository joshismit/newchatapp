import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Conversation } from '../utils/api';
import dayjs from 'dayjs';

interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
  onLongPress?: () => void;
  currentUserId?: string;
}

export default function ConversationItem({
  conversation,
  onPress,
  onLongPress,
  currentUserId,
}: ConversationItemProps) {
  const getAvatar = () => {
    if (conversation.type === 'private' && conversation.otherMember) {
      return conversation.otherMember.avatarUrl;
    }
    // For group chats, use first member's avatar or default
    return conversation.members[0]?.avatarUrl;
  };

  const getTitle = () => {
    if (conversation.title) {
      return conversation.title;
    }
    if (conversation.type === 'private' && conversation.otherMember) {
      return conversation.otherMember.name;
    }
    return 'Unknown';
  };

  const getLastMessageSnippet = () => {
    if (conversation.lastMessage?.text) {
      const senderName = conversation.lastMessage.senderName;
      const text = conversation.lastMessage.text;
      
      // For group chats, show sender name
      if (conversation.type === 'group' && senderName) {
        return `${senderName}: ${text}`;
      }
      return text;
    }
    return 'No messages yet';
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    
    try {
      const date = dayjs(timestamp);
      const now = dayjs();
      
      if (now.diff(date, 'day') < 1) {
        return date.format('HH:mm');
      } else if (now.diff(date, 'day') < 7) {
        return date.format('ddd');
      } else {
        return date.format('MMM D');
      }
    } catch (error) {
      return '';
    }
  };

  const avatarUrl = getAvatar();
  const title = getTitle();
  const lastMessage = getLastMessageSnippet();
  const time = formatTime(conversation.lastMessageAt);
  const unreadCount = conversation.unreadCount || 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons
              name={conversation.type === 'group' ? 'people' : 'person'}
              size={24}
              color="#999"
            />
          </View>
        )}
        {conversation.type === 'group' && (
          <View style={styles.groupBadge}>
            <Ionicons name="people" size={10} color="#fff" />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {time ? <Text style={styles.time}>{time}</Text> : null}
        </View>
        <View style={styles.footer}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMessage}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0f0',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});

