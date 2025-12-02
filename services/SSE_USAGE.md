# SSE Service Usage Guide

## Overview

The SSE service provides real-time event streaming from the backend to the Expo app.

## Features

- ✅ Automatic connection on app start (if JWT token exists)
- ✅ Reconnection with exponential backoff (max 5 attempts)
- ✅ Last-Event-ID support for reconnection
- ✅ Event persistence to AsyncStorage
- ✅ Multiple event handlers support
- ✅ Proper cleanup on unmount

## Event Types

- `connected` - SSE connection established
- `message` - Generic message event
- `message:new` - New message received
- `message:status` - Message status update (delivered/read)
- `conversation:new` - New conversation created
- `conversation:updated` - Conversation metadata updated
- `user:typing` - User typing indicator
- `user:online` - User came online
- `user:offline` - User went offline
- `notification` - General notification

## Basic Usage

### Automatic Connection (App.tsx)

The SSE service automatically connects when the app starts if a JWT token exists:

```typescript
// Already implemented in App.tsx
useEffect(() => {
  const initializeSSE = async () => {
    const token = await getAuthToken();
    if (token) {
      await sseService.connectSSE(token, (event) => {
        console.log('SSE Event:', event.type, event.data);
      });
    }
  };
  initializeSSE();
  
  return () => {
    sseService.disconnectSSE();
  };
}, []);
```

### Manual Connection

```typescript
import { sseService } from './services/sse';

// Connect with event handler
await sseService.connectSSE(jwtToken, (event) => {
  switch (event.type) {
    case 'message:new':
      // Handle new message
      console.log('New message:', event.data.message);
      break;
    case 'message:status':
      // Handle status update
      console.log('Message status:', event.data);
      break;
  }
});
```

### Disconnect

```typescript
sseService.disconnectSSE();
```

## Adding Event Handlers

```typescript
import { sseService, SSEEventHandler } from './services/sse';

const handleMessage: SSEEventHandler = (event) => {
  if (event.type === 'message:new') {
    // Update UI with new message
    updateMessages(event.data.message);
  }
};

// Add handler
sseService.addEventHandler(handleMessage);

// Remove handler (cleanup)
sseService.removeEventHandler(handleMessage);
```

## Getting Stored Events

```typescript
const events = await sseService.getStoredEvents();
console.log('Stored events:', events);
```

## Checking Connection Status

```typescript
const status = sseService.getConnectionStatus();
console.log('Connected:', status.connected);
console.log('Connecting:', status.connecting);
```

## Example: Message Screen

```typescript
import React, { useEffect, useState } from 'react';
import { sseService, SSEEvent } from '../services/sse';

export default function MessagesScreen() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const handleNewMessage: SSEEventHandler = (event) => {
      if (event.type === 'message:new') {
        setMessages((prev) => [...prev, event.data.message]);
      }
    };

    sseService.addEventHandler(handleNewMessage);

    return () => {
      sseService.removeEventHandler(handleNewMessage);
    };
  }, []);

  return (
    // Your UI
  );
}
```

## Reconnection Behavior

- **Exponential Backoff**: 1s, 2s, 4s, 8s, 16s
- **Max Attempts**: 5 attempts
- **Last-Event-ID**: Automatically sent on reconnection
- **Auto-Reconnect**: Automatically attempts reconnection on disconnect

## Event Storage

- Events are automatically stored in AsyncStorage
- Last 1000 events are kept (prevents storage bloat)
- Events include: `id`, `type`, `data`, `timestamp`

## Environment Variable

Set in `.env` or `app.json`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Troubleshooting

### Connection Issues

1. Verify JWT token is valid
2. Check API_BASE_URL is correct
3. Ensure backend SSE endpoint is accessible
4. Check network connectivity

### Events Not Received

1. Verify event handlers are registered
2. Check console logs for errors
3. Verify backend is sending events
4. Check event type matches handler

### Reconnection Issues

1. Check max attempts not exceeded
2. Verify network is stable
3. Check backend SSE endpoint is responding

