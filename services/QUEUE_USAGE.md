# Offline Queue and Sync Service

## Overview

The message queue service provides offline-first messaging with automatic sync when connectivity is restored.

## Features

- ✅ Queue outgoing messages when offline
- ✅ Automatic flush on reconnect (NetInfo + SSE)
- ✅ Message reconciliation by clientId
- ✅ Retry mechanism (max 5 attempts)
- ✅ Status updates (queued → sending → sent)
- ✅ Persistent queue storage

## Architecture

### Queue Service (`services/queue.ts`)

- **`queueOutgoing(message)`** - Add message to queue
- **`flushQueue()`** - Send all queued messages
- **`reconcileMessage()`** - Match server response with local message by clientId
- **`getQueueSize()`** - Get number of queued messages
- **`clearQueue()`** - Clear all queued messages

### Integration Points

1. **App.tsx** - Monitors connectivity and flushes queue on reconnect
2. **ChatScreen** - Queues messages when offline, handles retry
3. **SSE Service** - Flushes queue on SSE reconnection

## Flow

### When Offline

1. User sends message
2. Message saved with status `'queued'`
3. Message added to queue
4. UI shows queued status (cloud icon)

### When Online Again

1. NetInfo detects connectivity
2. SSE reconnects
3. `flushQueue()` called automatically
4. Messages sent in order
5. Server responses reconcile with local messages by `clientId`
6. Status updated: `queued` → `sending` → `sent`

## Message Status Flow

```
queued → sending → sent → delivered → read
         ↓
       failed (retry available)
```

## Reconciliation

Messages are matched by `clientId`:
- Local message has `clientId` (nanoid)
- Server response includes same `clientId`
- Queue service matches and updates local message with server `id` and status

## Retry Logic

- Max 5 retry attempts
- Exponential backoff (handled by queue)
- After max retries, message marked as `failed`
- User can manually retry failed messages

## Usage

### Queue a Message

```typescript
import { messageQueue } from '../services/queue';

// When offline, queue message
await messageQueue.queueOutgoing(message);
```

### Flush Queue

```typescript
// Automatically called on reconnect
// Or manually:
await messageQueue.flushQueue();
```

### Monitor Queue

```typescript
const size = await messageQueue.getQueueSize();
console.log(`Queue size: ${size}`);
```

## Connectivity Monitoring

### NetInfo Integration

```typescript
import NetInfo from '@react-native-community/netinfo';

NetInfo.addEventListener((state) => {
  if (state.isConnected) {
    messageQueue.flushQueue();
  }
});
```

### SSE Integration

```typescript
sseService.addEventHandler((event) => {
  if (event.type === 'connected') {
    messageQueue.flushQueue();
  }
});
```

## Storage

- Queue stored in AsyncStorage: `outgoing_message_queue`
- Messages stored per conversation: `messages_{conversationId}`
- Status persisted: `queued`, `sending`, `sent`, `failed`

## Error Handling

- Network errors: Message stays in queue, retries on reconnect
- Auth errors: Queue flush skipped until token available
- Max retries: Message marked as failed, removed from queue
- Duplicate prevention: Queue checks for existing `clientId`

## Best Practices

1. **Always check connectivity** before sending
2. **Queue immediately** when offline
3. **Let automatic flush handle** reconnection
4. **Show queued status** in UI for user feedback
5. **Allow manual retry** for failed messages

## UI Indicators

- **Queued**: Cloud upload icon (gray)
- **Sending**: Clock icon
- **Sent**: Single checkmark
- **Delivered**: Double checkmark (gray)
- **Read**: Double checkmark (green)
- **Failed**: Alert icon (red, tappable to retry)

## Testing

1. Turn off network
2. Send messages (should queue)
3. Turn on network
4. Messages should send automatically
5. Check status updates in UI

