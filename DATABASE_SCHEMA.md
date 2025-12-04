# Database Schema Documentation

## Collections Overview

### 1. Users Collection

**Purpose:** User profile, active devices, last seen

**Schema:**
```typescript
{
  _id: ObjectId,                    // User ID
  name: string,                     // User name
  phone: string,                     // Phone number (unique)
  password?: string,                 // Optional (OTP-based auth)
  avatarUrl?: string,                // Profile picture URL
  activeDevices: [                  // Active device sessions
    {
      deviceId: string,
      deviceType: 'mobile' | 'desktop',
      lastActiveAt: Date,
      userAgent?: string,
      ipAddress?: string
    }
  ],
  lastSeen: Date,                    // Last seen timestamp
  createdAt: Date                    // Account creation date
}
```

**Indexes:**
- `phone` (unique)
- `lastSeen` (descending)

---

### 2. Sessions Collection (RefreshToken)

**Purpose:** Device sessions, JWT tokens

**Schema:**
```typescript
{
  _id: ObjectId,                     // Session ID
  userId: ObjectId,                  // User reference
  token: string,                     // Refresh token (unique)
  accessToken?: string,               // Current access token (optional)
  deviceId?: string,                 // Device identifier
  deviceType: 'mobile' | 'desktop',  // Device type
  userAgent?: string,                // Browser/client info
  ipAddress?: string,                // IP address
  expiresAt: Date,                   // Token expiration (TTL index)
  lastUsedAt: Date,                  // Last token usage
  createdAt: Date                    // Session creation date
}
```

**Indexes:**
- `userId` + `deviceType` (compound)
- `token` (unique)
- `userId` + `lastUsedAt` (descending)
- `deviceId`
- `expiresAt` (TTL - auto-delete expired)

**Note:** Also available as `Session` model alias

---

### 3. Messages Collection

**Purpose:** Chat messages between users

**Schema:**
```typescript
{
  _id: ObjectId,                      // Message ID
  senderId: ObjectId,                 // Sender user ID
  receiverId: ObjectId,               // Receiver user ID
  content: string,                    // Message content (text)
  type: 'text' | 'image' | 'video' | 'audio' | 'file',  // Message type
  status: 'sent' | 'delivered' | 'read',  // Message status
  timestamp: Date,                    // Message timestamp
  
  // Additional fields (backward compatibility)
  conversationId?: ObjectId,          // Optional: for group chats
  attachments?: [                     // File attachments
    {
      type: string,
      url: string,
      fileName?: string,
      fileSize?: number,
      mimeType?: string
    }
  ],
  clientId?: string,                 // Client-side ID (nanoid)
  deliveredTo?: ObjectId[],          // Users who received
  readBy?: ObjectId[],               // Users who read
  createdAt: Date                    // Alias for timestamp
}
```

**Required Indexes:**

1. **Sender + Receiver + Timestamp** (Compound)
   ```javascript
   { senderId: 1, receiverId: 1, timestamp: -1 }
   ```
   - Used for: Querying messages between two users, sorted by time

2. **Receiver + Timestamp**
   ```javascript
   { receiverId: 1, timestamp: -1 }
   ```
   - Used for: User's inbox (messages received)

3. **Sender + Timestamp**
   ```javascript
   { senderId: 1, timestamp: -1 }
   ```
   - Used for: User's sent messages

4. **Status + Timestamp** (Compound)
   ```javascript
   { status: 1, timestamp: -1 }
   ```
   - Used for: Querying messages by status

5. **Timestamp** (Single)
   ```javascript
   { timestamp: -1 }
   ```
   - Used for: General message sorting

6. **Sender + Receiver + Status** (Compound)
   ```javascript
   { senderId: 1, receiverId: 1, status: 1 }
   ```
   - Used for: Finding unread messages between users

**Additional Indexes:**
- `conversationId` + `timestamp` (for group chats, sparse)
- `clientId` (unique, sparse - for offline sync)

---

## Index Creation Script

Run this in MongoDB shell or Atlas:

```javascript
use newchatapp;

// Users Collection
db.users.createIndex({ phone: 1 }, { unique: true });
db.users.createIndex({ lastSeen: -1 });

// Sessions Collection (RefreshToken)
db.refreshtokens.createIndex({ userId: 1, deviceType: 1 });
db.refreshtokens.createIndex({ token: 1 }, { unique: true });
db.refreshtokens.createIndex({ userId: 1, lastUsedAt: -1 });
db.refreshtokens.createIndex({ deviceId: 1 });
db.refreshtokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Messages Collection - Required Indexes
// 1. Sender + Receiver + Timestamp
db.messages.createIndex({ senderId: 1, receiverId: 1, timestamp: -1 });

// 2. Receiver + Timestamp
db.messages.createIndex({ receiverId: 1, timestamp: -1 });

// 3. Sender + Timestamp
db.messages.createIndex({ senderId: 1, timestamp: -1 });

// 4. Status + Timestamp
db.messages.createIndex({ status: 1, timestamp: -1 });

// 5. Timestamp
db.messages.createIndex({ timestamp: -1 });

// 6. Sender + Receiver + Status
db.messages.createIndex({ senderId: 1, receiverId: 1, status: 1 });

// Additional indexes
db.messages.createIndex({ conversationId: 1, timestamp: -1 }, { sparse: true });
db.messages.createIndex({ clientId: 1 }, { unique: true, sparse: true });
```

---

## Query Examples

### Get messages between two users
```javascript
db.messages.find({
  $or: [
    { senderId: userId1, receiverId: userId2 },
    { senderId: userId2, receiverId: userId1 }
  ]
}).sort({ timestamp: -1 });
```

### Get user's inbox (received messages)
```javascript
db.messages.find({ receiverId: userId })
  .sort({ timestamp: -1 });
```

### Get unread messages
```javascript
db.messages.find({
  receiverId: userId,
  status: { $in: ['sent', 'delivered'] }
}).sort({ timestamp: -1 });
```

### Get messages by status
```javascript
db.messages.find({ status: 'sent' })
  .sort({ timestamp: -1 });
```

---

## Field Mappings

### Message Model
- `_id` → Message ID
- `senderId` → Sender user ID
- `receiverId` → Receiver user ID
- `content` → Message text content
- `type` → Message type (text/image/video)
- `status` → Message status (sent/delivered/read)
- `timestamp` → Message timestamp (primary)
- `createdAt` → Alias for timestamp (backward compatibility)

---

## Migration Notes

### Breaking Changes
- Messages now require `receiverId` (was `conversationId` only)
- Messages now use `content` instead of `text`
- Messages now use `timestamp` as primary field (was `createdAt`)

### Backward Compatibility
- `conversationId` still supported (optional, for group chats)
- `createdAt` auto-synced with `timestamp`
- Old message format still works (migration script may be needed)

---

## Collection Summary

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | User profiles | phone, activeDevices, lastSeen |
| `sessions` (refreshtokens) | Device sessions | userId, token, deviceType, expiresAt |
| `messages` | Chat messages | senderId, receiverId, content, type, status, timestamp |

---

## Index Performance

### Query Performance
- **Sender + Receiver queries:** O(log n) with compound index
- **Status queries:** O(log n) with status index
- **Timestamp sorting:** O(log n) with timestamp index

### Index Size
- Compound indexes slightly larger but significantly faster
- Sparse indexes save space for optional fields
- TTL indexes auto-cleanup expired documents

---

## Best Practices

1. **Always use indexes** for queries on senderId, receiverId, status, timestamp
2. **Use compound indexes** for multi-field queries
3. **Update lastSeen** when user is active
4. **Track activeDevices** when user logs in/out
5. **Use timestamp** for message time (not createdAt)
6. **Set status** appropriately: sent → delivered → read

