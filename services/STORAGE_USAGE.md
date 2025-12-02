# Storage Service Usage Guide

## Overview

The storage service provides local persistence for messages, conversations, and authentication tokens using AsyncStorage.

## Features

- ✅ Save/load conversations with messages
- ✅ Append individual messages
- ✅ Update message status
- ✅ Conversation list management
- ✅ Token storage (save/get/remove)
- ✅ User ID storage
- ✅ Automatic deduplication
- ✅ Message sorting by timestamp

## Storage Structure

- **Messages**: Stored per conversation as `messages_{conversationId}`
- **Conversations List**: Stored as `conversations` (metadata only)
- **Token**: Stored as `auth_token`
- **User ID**: Stored as `user_id`

## API Reference

### Conversation Operations

#### `saveConversation(conversationId, messages)`
Save a full conversation with all messages.

```typescript
await storageService.saveConversation('conv123', [
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
]);
```

#### `loadConversation(conversationId)`
Load all messages for a conversation.

```typescript
const messages = await storageService.loadConversation('conv123');
```

#### `appendMessage(conversationId, message)`
Append a single message to a conversation. Automatically checks for duplicates.

```typescript
await storageService.appendMessage('conv123', {
  id: 'msg2',
  conversationId: 'conv123',
  senderId: 'user2',
  text: 'Hi there!',
  status: 'sent',
  createdAt: '2024-01-01T00:01:00Z',
  deliveredTo: [],
  readBy: [],
});
```

#### `updateMessage(conversationId, messageId, updates)`
Update an existing message (e.g., status change).

```typescript
// Partial update
await storageService.updateMessage('conv123', 'msg1', {
  status: 'delivered',
});

// Full message replacement
await storageService.updateMessage('conv123', 'msg1', fullMessageObject);
```

#### `getConversationsList()`
Get list of all conversations with metadata.

```typescript
const conversations = await storageService.getConversationsList();
// Returns: [{ id, lastMessageAt, updatedAt }, ...]
```

#### `saveConversationMetadata(conversation)`
Save conversation metadata to the list.

```typescript
await storageService.saveConversationMetadata({
  id: 'conv123',
  type: 'private',
  members: [...],
  createdAt: '2024-01-01T00:00:00Z',
  // ...
});
```

### Token Operations

#### `saveToken(token)`
Save authentication token.

```typescript
await storageService.saveToken('jwt_token_here');
```

#### `getToken()`
Get stored authentication token.

```typescript
const token = await storageService.getToken();
```

#### `removeToken()`
Remove authentication token.

```typescript
await storageService.removeToken();
```

### User ID Operations

#### `saveUserId(userId)`
Save user ID.

```typescript
await storageService.saveUserId('user123');
```

#### `getUserId()`
Get stored user ID.

```typescript
const userId = await storageService.getUserId();
```

#### `removeUserId()`
Remove user ID.

```typescript
await storageService.removeUserId();
```

### Utility Operations

#### `clearAll()`
Clear all stored data (useful for logout).

```typescript
await storageService.clearAll();
```

#### `getStorageSize()`
Get approximate storage size in bytes (for debugging).

```typescript
const size = await storageService.getStorageSize();
```

## Type Definitions

```typescript
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

export interface Conversation {
  id: string;
  type: 'private' | 'group';
  title?: string;
  members: Array<{
    id: string;
    name: string;
    avatarUrl?: string;
    phone?: string;
  }>;
  lastMessageAt?: string; // ISO string
  createdAt: string; // ISO string
  archived: boolean;
}
```

## Example: ChatScreen Integration

See `screens/ChatScreen.tsx` for a complete example:

1. **Load messages on mount**:
```typescript
useEffect(() => {
  loadMessages();
}, [conversationId]);

const loadMessages = async () => {
  const localMessages = await storageService.loadConversation(conversationId);
  setMessages(localMessages);
  
  // Sync with server...
};
```

2. **Handle SSE messages**:
```typescript
useEffect(() => {
  const handleNewMessage: SSEEventHandler = (event) => {
    if (event.type === 'message:new') {
      handleIncomingMessage(event.data.message);
    }
  };
  
  sseService.addEventHandler(handleNewMessage);
  return () => sseService.removeEventHandler(handleNewMessage);
}, []);

const handleIncomingMessage = async (messageData: any) => {
  const message: Message = { /* ... */ };
  await storageService.appendMessage(conversationId, message);
  setMessages((prev) => [...prev, message]);
};
```

3. **Send message with optimistic update**:
```typescript
const sendMessage = async () => {
  // Create optimistic message
  const optimisticMessage: Message = { /* ... */ };
  
  // Add to UI and storage
  setMessages((prev) => [...prev, optimisticMessage]);
  await storageService.appendMessage(conversationId, optimisticMessage);
  
  // Send to server
  const response = await sendMessageAPI({ /* ... */ });
  
  // Replace optimistic with server response
  await storageService.updateMessage(
    conversationId,
    optimisticMessage.id,
    serverMessage
  );
};
```

## Best Practices

1. **Always load from storage first** for instant UI display
2. **Sync with server** after loading local data
3. **Use optimistic updates** for better UX
4. **Handle duplicates** - storage service checks automatically
5. **Update message status** when SSE events arrive
6. **Clear storage on logout** using `clearAll()`

## Performance Considerations

- Messages are stored per conversation (efficient loading)
- Conversation list is separate (quick access)
- Automatic sorting by timestamp
- Deduplication prevents storage bloat
- Consider pagination for very large conversations

## Error Handling

All storage operations include try-catch blocks and return empty arrays/null on error. Check console logs for debugging.

