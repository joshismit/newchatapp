import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message, MessageStatus } from '../services/storage';
import dayjs from 'dayjs';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onRetry?: (message: Message) => void;
}

export default function MessageBubble({ message, isOwn, onRetry }: MessageBubbleProps) {
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Ionicons name="time-outline" size={12} color="#999" />;
      case 'queued':
        return <Ionicons name="cloud-upload-outline" size={12} color="#999" />;
      case 'sent':
        return <Ionicons name="checkmark" size={12} color="#999" />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={12} color="#999" />;
      case 'read':
        return <Ionicons name="checkmark-done" size={12} color="#25D366" />;
      case 'failed':
        return (
          <TouchableOpacity onPress={() => onRetry?.(message)}>
            <Ionicons name="alert-circle" size={14} color="#ff4444" />
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = dayjs(timestamp);
    const now = dayjs();
    
    if (now.diff(date, 'day') < 1) {
      return date.format('HH:mm');
    } else if (now.diff(date, 'day') < 7) {
      return date.format('ddd HH:mm');
    } else {
      return date.format('MMM D, HH:mm');
    }
  };

  return (
    <View
      style={[
        styles.container,
        isOwn ? styles.ownContainer : styles.otherContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isOwn ? styles.ownBubble : styles.otherBubble,
        ]}
      >
        {message.text ? (
          <Text
            style={[
              styles.text,
              isOwn ? styles.ownText : styles.otherText,
            ]}
          >
            {message.text}
          </Text>
        ) : null}

        {message.attachments && message.attachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            {message.attachments.map((attachment, index) => (
              <View key={index} style={styles.attachment}>
                <Ionicons
                  name={
                    attachment.type === 'image'
                      ? 'image'
                      : attachment.type === 'video'
                      ? 'videocam'
                      : 'document'
                  }
                  size={20}
                  color={isOwn ? '#fff' : '#666'}
                />
                <Text
                  style={[
                    styles.attachmentText,
                    isOwn ? styles.ownText : styles.otherText,
                  ]}
                  numberOfLines={1}
                >
                  {attachment.fileName || 'Attachment'}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text
            style={[
              styles.time,
              isOwn ? styles.ownTime : styles.otherTime,
            ]}
          >
            {formatTime(message.createdAt)}
          </Text>
          {isOwn && (
            <View style={styles.statusIcon}>{getStatusIcon()}</View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
    paddingHorizontal: 12,
    maxWidth: '80%',
  },
  ownContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    minWidth: 60,
  },
  ownBubble: {
    backgroundColor: '#25D366',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownText: {
    color: '#fff',
  },
  otherText: {
    color: '#000',
  },
  attachmentsContainer: {
    marginTop: 4,
    gap: 8,
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
  },
  attachmentText: {
    flex: 1,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  time: {
    fontSize: 11,
    marginTop: 2,
  },
  ownTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherTime: {
    color: '#666',
  },
  statusIcon: {
    marginLeft: 2,
  },
});

