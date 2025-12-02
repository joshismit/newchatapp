# Postman Collection Setup Guide

## Import Collection

1. Open Postman
2. Click **Import** button
3. Select `postman_collection.json` file
4. Collection will be imported with all endpoints

## Environment Variables Setup

Create a new environment in Postman with these variables:

### Required Variables

- `base_url` - `http://localhost:3000` (or your server URL)
- `jwt_token` - Will be auto-set after QR login flow
- `challengeId` - Will be auto-set after creating QR challenge
- `conversationId` - Will be auto-set after creating/listing conversations
- `messageId` - Will be auto-set after sending a message
- `testUserId` - Your test user ID (for testing)
- `testUserId2` - Second test user ID (for group conversations)
- `attachmentUrl` - Will be auto-set after uploading attachment
- `qrPayload` - Will be auto-set after creating QR challenge

## Testing Flow

### 1. QR Login Flow (Desktop)

1. **Create QR Challenge** - Gets challengeId and qrPayload
2. **Scan QR Code (Mobile)** - Use qrPayload token and testUserId
3. **Check QR Status** - Poll until status is "authorized"
4. **Confirm QR Challenge** - Gets JWT token (auto-saved to `jwt_token`)

### 2. SSE Connection

- **Connect to SSE Stream** - Opens SSE connection (may not display properly in Postman)
- Use curl or browser for better SSE testing:
  ```bash
  curl -N -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/sse/connect
  ```

### 3. Conversations

1. **List Conversations** - Gets all conversations (auto-saves first conversationId)
2. **Create Conversation (1:1)** - Creates 1:1 chat
3. **Create Group Conversation** - Creates group chat
4. **Get Conversation Details** - Gets conversation with messages
5. **Archive Conversation** - Archive/unarchive

### 4. Messages

1. **Send Message** - Send text message (auto-saves messageId)
2. **Send Message with Attachment** - Send message with file
3. **Get Messages** - Get paginated messages
4. **Mark Message as Delivered** - Update delivery status
5. **Mark Message as Read** - Update read status

### 5. Attachments

1. **Upload Attachment** - Upload file (auto-saves attachmentUrl)
2. Use attachmentUrl in "Send Message with Attachment"

## Quick Test Script

```bash
# Set your test user IDs
export TEST_USER_ID="your-user-id-1"
export TEST_USER_ID_2="your-user-id-2"

# 1. Create QR challenge
curl http://localhost:3000/auth/qr-challenge

# 2. Scan QR (mobile)
curl -X POST http://localhost:3000/auth/qr-scan \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"QR_TOKEN\", \"userId\": \"$TEST_USER_ID\"}"

# 3. Confirm QR (desktop)
curl -X POST http://localhost:3000/auth/qr-confirm \
  -H "Content-Type: application/json" \
  -d "{\"challengeId\": \"CHALLENGE_ID\"}"

# 4. List conversations
curl http://localhost:3000/conversations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Notes

- All endpoints that require authentication use `{{jwt_token}}` variable
- Variables are auto-populated by test scripts in each request
- SSE endpoints work best with curl or browser (Postman has limited SSE support)
- Make sure your server is running on the `base_url` port

