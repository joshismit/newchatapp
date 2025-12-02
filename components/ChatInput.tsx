import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach?: () => void;
  sending?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  value,
  onChangeText,
  onSend,
  onAttach,
  sending = false,
  disabled = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const [inputHeight, setInputHeight] = useState(40);

  const handleContentSizeChange = (event: any) => {
    const height = Math.min(Math.max(40, event.nativeEvent.contentSize.height), 120);
    setInputHeight(height);
  };

  const canSend = value.trim().length > 0 && !sending && !disabled;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.attachButton}
        onPress={onAttach}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons name="attach" size={24} color="#25D366" />
      </TouchableOpacity>

      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            {
              height: inputHeight,
              maxHeight: 120,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
          editable={!disabled}
          onContentSizeChange={handleContentSizeChange}
          textAlignVertical="center"
        />
      </View>

      <TouchableOpacity
        style={[
          styles.sendButton,
          !canSend && styles.sendButtonDisabled,
        ]}
        onPress={onSend}
        disabled={!canSend}
        activeOpacity={0.7}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="send" size={20} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    ...Platform.select({
      ios: {
        paddingBottom: 20,
      },
      android: {
        paddingBottom: 8,
      },
    }),
  },
  attachButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    minHeight: 40,
    maxHeight: 120,
  },
  input: {
    fontSize: 16,
    color: '#000',
    padding: 0,
    margin: 0,
    ...Platform.select({
      ios: {
        paddingTop: 0,
      },
    }),
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
});

