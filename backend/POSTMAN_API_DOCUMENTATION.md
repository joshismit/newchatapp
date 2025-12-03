# Complete API Documentation for Postman Testing

## Base URL

```
Local: http://localhost:3000
Production: https://your-service-name.onrender.com
```

## Environment Variables for Postman

Set these in Postman Environment:

```
base_url: http://localhost:3000
jwt_token: (will be set automatically after login)
testUserId: (will be set automatically after login)
conversationId: (will be set automatically)
messageId: (will be set automatically)
attachmentUrl: (will be set automatically)
challengeId: (will be set automatically)
```

---

## 🔐 Authentication APIs

### 1. Login (Mobile)
**POST** `/auth/login`

**Description**: Login with phone number and password for mobile devices

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "phone": "9033868859",
  "password": "test1234"
}
```

**Response** (200):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "692fdae0de883765b1f7a92c",
    "name": "Demo User",
    "phone": "9033868859",
    "avatarUrl": null
  }
}
```

**Postman Test Script** (auto-saves token):
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    if (jsonData.success && jsonData.token) {
        pm.environment.set('jwt_token', jsonData.token);
        pm.environment.set('testUserId', jsonData.user.id);
    }
}
```

---

### 2. Create QR Challenge (Desktop)
**GET** `/auth/qr-challenge`

**Description**: Create a new QR challenge for desktop login

**Headers**: None

**Response** (200):
```json
{
  "challengeId": "692fdae0de883765b1f7a92c",
  "qrPayload": "http://localhost:3000/auth/qr-scan?token=abc123xyz"
}
```

**Postman Test Script** (auto-saves challengeId):
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set('challengeId', jsonData.challengeId);
    pm.environment.set('qrPayload', jsonData.qrPayload);
}
```

---

### 3. Scan QR Code (Mobile)
**POST** `/auth/qr-scan`

**Description**: Mobile app scans QR code and authorizes desktop login

**Headers**:
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body**:
```json
{
  "token": "abc123xyz"
}
```

**Note**: Token is extracted from QR code URL. userId is automatically extracted from JWT token.

**Response** (200):
```json
{
  "success": true,
  "challengeId": "692fdae0de883765b1f7a92c"
}
```

---

### 4. Check QR Status
**GET** `/auth/qr-status?challengeId={{challengeId}}`

**Description**: Check QR challenge status (for desktop polling)

**Headers**: None

**Query Parameters**:
- `challengeId` (required): Challenge ID from QR creation

**Response** (200):
```json
{
  "status": "pending" | "authorized" | "expired",
  "user": {
    "id": "692fdae0de883765b1f7a92c",
    "name": "Demo User",
    "avatar": "https://..."
  }
}
```

---

### 5. Confirm QR Challenge (Desktop)
**POST** `/auth/qr-confirm`

**Description**: Desktop confirms QR challenge and gets JWT token

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "challengeId": "692fdae0de883765b1f7a92c"
}
```

**Response** (200):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "692fdae0de883765b1f7a92c",
    "name": "Demo User",
    "phone": "9033868859",
    "avatarUrl": null
  }
}
```

**Postman Test Script**:
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set('jwt_token', jsonData.token);
}
```

---

## 💬 Conversation APIs

### 6. List Conversations
**GET** `/conversations`

**Description**: Get all conversations for authenticated user

**Headers**:
```
Authorization: Bearer {{jwt_token}}
```

**Response** (200):
```json
{
  "success": true,
  "conversations": [
    {
      "id": "conv123",
      "type": "private",
      "members": [...],
      "lastMessageAt": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-10T08:00:00.000Z",
      "archived": false
    }
  ],
  "count": 1
}
```

**Postman Test Script**:
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    if (jsonData.conversations && jsonData.conversations.length > 0) {
        pm.environment.set('conversationId', jsonData.conversations[0].id);
    }
}
```

---

### 7. Create 1:1 Conversation
**POST** `/conversations`

**Description**: Create a private conversation with another user

**Headers**:
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body**:
```json
{
  "memberIds": ["692fdae0de883765b1f7a92c"]
}
```

**Response** (201):
```json
{
  "success": true,
  "conversation": {
    "id": "conv123",
    "type": "private",
    "members": [...],
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 8. Create Group Conversation
**POST** `/conversations`

**Description**: Create a group conversation

**Headers**:
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body**:
```json
{
  "type": "group",
  "title": "Team Chat",
  "memberIds": ["user1", "user2", "user3"]
}
```

**Response** (201):
```json
{
  "success": true,
  "conversation": {
    "id": "conv456",
    "type": "group",
    "title": "Team Chat",
    "members": [...],
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 9. Get Conversation Details
**GET** `/conversations/{{conversationId}}?limit=20`

**Description**: Get conversation with last N messages

**Headers**:
```
Authorization: Bearer {{jwt_token}}
```

**Query Parameters**:
- `limit` (optional): Number of messages to return (default: 20, max: 50)

**Response** (200):
```json
{
  "success": true,
  "conversation": {
    "id": "conv123",
    "type": "private",
    "members": [...],
    "messages": [...]
  }
}
```

---

### 10. Archive/Unarchive Conversation
**PATCH** `/conversations/{{conversationId}}/archive`

**Description**: Archive or unarchive a conversation

**Headers**:
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body**:
```json
{
  "archived": true
}
```

**Response** (200):
```json
{
  "success": true,
  "archived": true
}
```

---

## 📨 Message APIs

### 11. Send Message
**POST** `/messages/send`

**Description**: Send a text message to a conversation

**Headers**:
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body**:
```json
{
  "conversationId": "conv123",
  "text": "Hello, this is a test message!",
  "clientId": "client-generated-nanoid"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": {
    "id": "msg123",
    "conversationId": "conv123",
    "senderId": "user123",
    "text": "Hello, this is a test message!",
    "status": "sent",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Postman Test Script**:
```javascript
if (pm.response.code === 201) {
    const jsonData = pm.response.json();
    pm.environment.set('messageId', jsonData.message.id);
}
```

---

### 12. Send Message with Attachment
**POST** `/messages/send`

**Description**: Send a message with file attachment

**Headers**:
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body**:
```json
{
  "conversationId": "conv123",
  "text": "Check out this image!",
  "attachments": [
    {
      "type": "image",
      "url": "https://...",
      "fileName": "photo.jpg",
      "fileSize": 1024000,
      "mimeType": "image/jpeg"
    }
  ]
}
```

**Note**: Upload attachment first using `/attachments` endpoint, then use the returned URL.

---

### 13. Get Messages
**GET** `/messages?conversationId={{conversationId}}&limit=20&before=2024-01-15T10:30:00.000Z`

**Description**: Get paginated messages for a conversation

**Headers**:
```
Authorization: Bearer {{jwt_token}}
```

**Query Parameters**:
- `conversationId` (required): Conversation ID
- `limit` (optional): Number of messages (default: 20, max: 100)
- `before` (optional): ISO timestamp for pagination (get messages before this time)

**Response** (200):
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg123",
      "conversationId": "conv123",
      "senderId": "user123",
      "text": "Hello!",
      "status": "sent",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "deliveredTo": ["user456"],
      "readBy": []
    }
  ]
}
```

---

### 14. Mark Message as Delivered
**POST** `/messages/{{messageId}}/delivered`

**Description**: Mark message as delivered to a user

**Headers**:
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body**:
```json
{
  "toUserId": "user456"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": {
    "id": "msg123",
    "deliveredTo": ["user456"]
  }
}
```

---

### 15. Mark Message as Read
**POST** `/messages/{{messageId}}/read`

**Description**: Mark message as read by a user

**Headers**:
```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body**:
```json
{
  "userId": "user456"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": {
    "id": "msg123",
    "readBy": ["user456"]
  }
}
```

---

## 📎 Attachment APIs

### 16. Upload Attachment
**POST** `/attachments`

**Description**: Upload a file attachment

**Headers**:
```
Authorization: Bearer {{jwt_token}}
```

**Body**: `multipart/form-data`
- `file` (file): The file to upload

**Response** (200):
```json
{
  "success": true,
  "url": "https://...",
  "fileName": "photo.jpg",
  "fileSize": 1024000,
  "mimeType": "image/jpeg"
}
```

**Postman Test Script**:
```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set('attachmentUrl', jsonData.url);
}
```

---

## 🔄 SSE (Server-Sent Events)

### 17. Connect to SSE Stream
**GET** `/sse/connect?token={{jwt_token}}`

**Description**: Connect to real-time event stream

**Headers**:
```
Accept: text/event-stream
Authorization: Bearer {{jwt_token}}
```

**Query Parameters**:
- `token` (optional): JWT token (can also use Authorization header)

**Note**: Postman may not display SSE properly. Use curl or browser for testing:

```bash
curl -N -H "Accept: text/event-stream" \
  "http://localhost:3000/sse/connect?token=YOUR_JWT_TOKEN"
```

**Response**: Server-Sent Events stream

---

## 🏥 Health Check

### 18. Health Check
**GET** `/health`

**Description**: Check if server is running

**Headers**: None

**Response** (200):
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 📋 Complete Postman Collection

Import the `backend/postman_collection.json` file into Postman:

1. Open Postman
2. Click "Import"
3. Select "File" tab
4. Choose `backend/postman_collection.json`
5. Click "Import"

## 🔧 Postman Environment Setup

1. **Create Environment**:
   - Click "Environments" → "Create Environment"
   - Name: "NewChatApp Local" or "NewChatApp Production"

2. **Set Variables**:
   ```
   base_url: http://localhost:3000
   jwt_token: (leave empty, will be set automatically)
   testUserId: (leave empty, will be set automatically)
   conversationId: (leave empty, will be set automatically)
   messageId: (leave empty, will be set automatically)
   attachmentUrl: (leave empty, will be set automatically)
   challengeId: (leave empty, will be set automatically)
   ```

3. **Select Environment**: Select your environment from dropdown

## 🧪 Testing Flow

### Complete Authentication Flow:

1. **Login** → Gets JWT token (saved automatically)
2. **Create QR Challenge** → Gets challengeId
3. **Scan QR Code** → Authorizes challenge (use same JWT from step 1)
4. **Check QR Status** → Should return "authorized"
5. **Confirm QR Challenge** → Gets desktop JWT token

### Complete Chat Flow:

1. **Login** → Get JWT token
2. **List Conversations** → See existing conversations
3. **Create Conversation** → Create new conversation
4. **Send Message** → Send a message
5. **Get Messages** → Retrieve messages
6. **Mark as Read** → Mark message as read

## 📝 Notes

- All endpoints except `/health` and `/auth/login` require JWT authentication
- JWT token is automatically saved after login
- Variables are automatically set by test scripts
- For production testing, update `base_url` to your Render URL

