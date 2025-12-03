# API Quick Reference Guide

## Base URL
- **Local**: `http://localhost:3000`
- **Production**: `https://your-service-name.onrender.com`

---

## 🔐 Authentication APIs

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/auth/login` | ❌ | Login with phone & password |
| GET | `/auth/qr-challenge` | ❌ | Create QR challenge for desktop |
| POST | `/auth/qr-scan` | ✅ | Mobile scans QR code |
| GET | `/auth/qr-status` | ❌ | Check QR challenge status |
| POST | `/auth/qr-confirm` | ❌ | Desktop confirms QR & gets token |

---

## 💬 Conversation APIs

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/conversations` | ✅ | List all conversations |
| POST | `/conversations` | ✅ | Create conversation (1:1 or group) |
| GET | `/conversations/:id` | ✅ | Get conversation details |
| PATCH | `/conversations/:id/archive` | ✅ | Archive/unarchive conversation |

---

## 📨 Message APIs

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/messages/send` | ✅ | Send a message |
| GET | `/messages` | ✅ | Get paginated messages |
| POST | `/messages/:id/delivered` | ✅ | Mark message as delivered |
| POST | `/messages/:id/read` | ✅ | Mark message as read |

---

## 📎 Attachment APIs

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/attachments` | ✅ | Upload file attachment |

---

## 🔄 SSE (Server-Sent Events)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/sse/connect` | ✅ | Connect to real-time event stream |

---

## 🏥 Health Check

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/health` | ❌ | Check server status |

---

## 📋 Request Examples

### 1. Login
```bash
POST /auth/login
Content-Type: application/json

{
  "phone": "9033868859",
  "password": "test1234"
}
```

### 2. Create QR Challenge
```bash
GET /auth/qr-challenge
```

### 3. Scan QR Code (Mobile)
```bash
POST /auth/qr-scan
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "token": "abc123xyz"
}
```

### 4. Confirm QR Challenge (Desktop)
```bash
POST /auth/qr-confirm
Content-Type: application/json

{
  "challengeId": "692fdae0de883765b1f7a92c"
}
```

### 5. List Conversations
```bash
GET /conversations
Authorization: Bearer <JWT_TOKEN>
```

### 6. Create Conversation
```bash
POST /conversations
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "memberIds": ["user123"]
}
```

### 7. Send Message
```bash
POST /messages/send
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "conversationId": "conv123",
  "text": "Hello!",
  "clientId": "client-generated-id"
}
```

### 8. Get Messages
```bash
GET /messages?conversationId=conv123&limit=20
Authorization: Bearer <JWT_TOKEN>
```

### 9. Upload Attachment
```bash
POST /attachments
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data

file: <file>
```

---

## 🔑 Authentication

Most endpoints require JWT authentication via Bearer token:

```
Authorization: Bearer <JWT_TOKEN>
```

**How to get JWT token:**
1. Login via `/auth/login` → Returns `token` in response
2. Use QR login flow → Returns `token` after confirmation

---

## 📝 Postman Collection

Import `backend/postman_collection.json` into Postman for:
- ✅ Pre-configured requests
- ✅ Auto-saved variables (jwt_token, conversationId, etc.)
- ✅ Test scripts for automatic variable extraction
- ✅ Organized folder structure

---

## 🧪 Testing Flow

### Complete Authentication Flow:
1. **Login** → Get JWT token
2. **Create QR Challenge** → Get challengeId
3. **Scan QR Code** → Authorize (use JWT from step 1)
4. **Check QR Status** → Should return "authorized"
5. **Confirm QR Challenge** → Get desktop JWT token

### Complete Chat Flow:
1. **Login** → Get JWT token
2. **List Conversations** → See existing conversations
3. **Create Conversation** → Create new conversation
4. **Send Message** → Send a message
5. **Get Messages** → Retrieve messages
6. **Mark as Read** → Mark message as read

---

## ⚠️ Important Notes

- All endpoints except `/health` and `/auth/login` require JWT authentication
- JWT token expires after 7 days (configurable)
- QR challenges expire after 5 minutes
- Use `Authorization: Bearer <token>` header for authenticated requests
- For file uploads, use `multipart/form-data` with field name `file`

---

## 📚 Full Documentation

See `backend/POSTMAN_API_DOCUMENTATION.md` for detailed API documentation with:
- Complete request/response examples
- Error handling
- Query parameters
- Postman environment setup
- Testing workflows

