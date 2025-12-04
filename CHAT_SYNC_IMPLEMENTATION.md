# Chat Sync Flow Implementation (WhatsApp-like)

## Overview

This document describes the implementation of WhatsApp-like chat synchronization for desktop sessions. When a desktop session is created, the backend automatically loads recent messages from the database and sends them through Server-Sent Events (SSE), which are then stored locally on the desktop client.

## Architecture

### Backend Components

#### 1. Message Sync Service (`backend/src/services/messageSyncService.ts`)

- **Purpose**: Loads recent messages for desktop session initialization
- **Key Methods**:
  - `getRecentMessagesForUser(userId, limitPerConversation, daysBack)`: Loads recent messages from all conversations the user is part of
  - `getRecentMessagesForConversations(userId, conversationIds, limitPerConversation)`: Loads messages for specific conversations

**Features**:
- Loads messages from last 7 days by default
- Returns up to 50 messages per conversation by default
- Handles both conversation-based messages (group chats) and direct messages (senderId/receiverId)
- Formats messages with sender information

#### 2. SSE Routes (`backend/src/routes/sseRoutes.ts`)

- **Desktop Detection**: Detects desktop sessions via User-Agent header or `deviceType` query parameter
- **Automatic Sync**: When a desktop client connects:
  1. Detects it's a desktop session
  2. Asynchronously loads recent messages using `messageSyncService`
  3. Sends `sync:initial` event with conversation metadata
  4. Sends individual `message:sync` events for each message
  5. Handles errors gracefully with `sync:error` event

**Event Types**:
- `sync:initial`: Initial sync event with conversation list
- `message:sync`: Individual message sync event
- `sync:error`: Error event if sync fails

#### 3. Auth Controller (`backend/src/controllers/authController.ts`)

- **New Endpoint**: `GET /auth/sync-messages`
  - Returns recent messages for authenticated user
  - Query parameters:
    - `limit`: Number of messages per conversation (default: 50)
    - `days`: Days back to sync (default: 7)
  - Used as fallback if SSE sync fails

### Frontend Components

#### 1. Storage Service (`services/storage.ts`)

- **Platform Support**: Uses AsyncStorage (works on web, iOS, Android, and RN Desktop)
- **Message Storage**: Stores messages locally per conversation
- **Key Methods**:
  - `saveConversation(conversationId, messages)`: Save full conversation
  - `appendMessage(conversationId, message)`: Append single message
  - `loadConversation(conversationId)`: Load messages for conversation

**Note**: AsyncStorage works on all platforms including web. For web-specific IndexedDB support, this can be extended in the future.

#### 2. Desktop Login Screen (`screens/DesktopLoginScreen.tsx`)

- **Post-Login Sync**: After QR code authentication:
  1. Calls `syncMessages()` API to fetch recent messages
  2. Converts sync message format to storage format
  3. Stores messages locally using `storageService`
  4. Navigates to Conversations screen

**Fallback**: If API sync fails, messages will still sync via SSE events.

#### 3. SSE Service (`services/sse.ts`)

- **New Event Types**:
  - `sync:initial`: Initial sync event
  - `message:sync`: Individual message sync event
  - `sync:error`: Sync error event

- **Event Handlers**: Automatically handles sync events and stores messages locally

#### 4. App.tsx

- **SSE Sync Handler**: Listens for `message:sync` events
- **Automatic Storage**: Stores synced messages to local storage when received via SSE
- **Error Handling**: Logs sync errors but doesn't block app functionality

## Flow Diagram

```
Desktop Login Flow:
┌─────────────────┐
│ Desktop Client  │
└────────┬────────┘
         │
         │ 1. Scan QR Code
         ▼
┌─────────────────┐
│ Mobile App      │
│ (Authorizes)    │
└────────┬────────┘
         │
         │ 2. POST /auth/qr-scan
         ▼
┌─────────────────┐
│ Backend         │
│ (Creates Session)│
└────────┬────────┘
         │
         │ 3. Desktop confirms
         │    POST /auth/qr-confirm
         ▼
┌─────────────────┐
│ Desktop Client  │
│ (Logged In)     │
└────────┬────────┘
         │
         │ 4a. GET /auth/sync-messages (API)
         │ 4b. GET /sse/connect (SSE)
         ▼
┌─────────────────┐
│ Backend         │
│ (Loads Messages)│
└────────┬────────┘
         │
         │ 5. Send via SSE:
         │    - sync:initial
         │    - message:sync (per message)
         ▼
┌─────────────────┐
│ Desktop Client  │
│ (Stores Locally) │
└─────────────────┘
```

## Message Sync Process

### Step 1: Desktop Session Creation
- Desktop scans QR code
- Mobile authorizes desktop session
- Desktop receives access token and refresh token

### Step 2: Initial Sync (Two Methods)

#### Method A: API Sync (Primary)
- Desktop calls `GET /auth/sync-messages` after login
- Backend returns recent messages (last 7 days, 50 per conversation)
- Desktop stores messages locally

#### Method B: SSE Sync (Automatic)
- Desktop connects to SSE (`GET /sse/connect?deviceType=desktop`)
- Backend detects desktop session
- Backend automatically loads and sends recent messages via SSE
- Desktop receives and stores messages

### Step 3: Ongoing Sync
- New messages arrive via SSE `message:new` events
- Messages are automatically stored locally
- UI updates in real-time

## API Endpoints

### GET /auth/sync-messages
**Authentication**: Required (JWT token)

**Query Parameters**:
- `limit` (optional): Number of messages per conversation (default: 50, max: 100)
- `days` (optional): Days back to sync (default: 7)

**Response**:
```json
{
  "success": true,
  "conversations": [
    {
      "conversationId": "conv123",
      "messages": [
        {
          "id": "msg123",
          "conversationId": "conv123",
          "senderId": "user123",
          "receiverId": "user456",
          "content": "Hello!",
          "type": "text",
          "status": "sent",
          "timestamp": "2024-01-15T10:30:00.000Z",
          "sender": {
            "id": "user123",
            "name": "John Doe",
            "avatarUrl": "https://..."
          }
        }
      ],
      "lastMessageAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

### GET /sse/connect
**Authentication**: Optional (JWT token in query, header, or Authorization header)

**Query Parameters**:
- `token` (optional): JWT token
- `deviceType` (optional): "desktop" or "mobile" (auto-detected from User-Agent if not provided)

**Events Sent**:
- `connected`: Connection established
- `sync:initial`: Initial sync event (desktop only)
- `message:sync`: Individual message sync event (desktop only)
- `message:new`: New message received
- `message:status`: Message status update
- `sync:error`: Sync error (desktop only)

## Storage Format

Messages are stored locally in the following format:

```typescript
interface Message {
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
```

## Error Handling

1. **API Sync Failure**: Falls back to SSE sync
2. **SSE Sync Failure**: Logs error but doesn't block login
3. **Storage Failure**: Logs error, messages still available via API
4. **Network Issues**: Messages queue for retry when connection restored

## Performance Considerations

- **Async Loading**: Message sync happens asynchronously, doesn't block UI
- **Batch Processing**: Messages sent individually via SSE for real-time updates
- **Local Storage**: Messages stored locally for offline access
- **Deduplication**: Storage service prevents duplicate messages

## Future Enhancements

1. **IndexedDB Support**: Add IndexedDB adapter for web platform (better performance for large datasets)
2. **Incremental Sync**: Sync only new messages since last sync timestamp
3. **Compression**: Compress message payloads for large conversations
4. **Background Sync**: Sync messages in background when app is idle
5. **Conflict Resolution**: Handle conflicts when messages arrive out of order

## Testing

### Test Desktop Sync:
1. Start backend server
2. Login on mobile app
3. Open desktop login screen
4. Scan QR code with mobile
5. Verify messages sync automatically
6. Check local storage for synced messages

### Test SSE Sync:
1. Connect desktop client to SSE
2. Verify `sync:initial` event received
3. Verify `message:sync` events received for each message
4. Check messages stored locally

### Test API Sync:
1. Login on desktop
2. Call `GET /auth/sync-messages`
3. Verify messages returned
4. Check messages stored locally

## Troubleshooting

### Messages Not Syncing:
1. Check backend logs for sync errors
2. Verify desktop session detection (check User-Agent)
3. Check SSE connection status
4. Verify authentication token is valid

### Storage Issues:
1. Check AsyncStorage permissions
2. Verify storage service is initialized
3. Check for storage quota limits

### Performance Issues:
1. Reduce `limit` parameter for sync
2. Reduce `days` parameter for sync
3. Implement pagination for large conversations

