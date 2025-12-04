# QR Code Based Device Linking

## Overview

Desktop devices link to user accounts by scanning a QR code displayed on desktop. The mobile app (master device) authorizes the desktop session.

---

## Flow Architecture

### Desktop (Secondary Device)

1. **Generate Temporary QR Token**
   - Desktop calls `GET /auth/qr-challenge`
   - Backend generates **UUID token** (random UUID)
   - Token stored in database with **2-5 minute expiry**
   - Returns `challengeId` and `qrPayload` (UUID token)

2. **Display QR Code**
   - Desktop displays QR code containing **UUID token only**
   - QR code format: `550e8400-e29b-41d4-a716-446655440000` (UUID)

3. **Polling/SSE for Approval**
   - Desktop polls `GET /auth/qr-status?challengeId=...` every 2 seconds
   - Waits for mobile approval
   - Status: `pending` → `authorized` → `expired`

4. **Get Desktop Session Token**
   - When status = `authorized`, desktop calls `POST /auth/qr-confirm`
   - Receives **long-lived desktop session tokens**:
     - Access Token (15 minutes)
     - Refresh Token (30 days, stored in DB)

### Mobile (Master Device)

1. **Scan QR Code**
   - Mobile app scans QR code from desktop
   - Extracts **UUID token** from QR code
   - Mobile must be **authenticated** (has JWT access token)

2. **Authorize Desktop Session**
   - Mobile sends:
     - QR token (UUID) in request body
     - Mobile JWT token in `Authorization: Bearer <token>` header
   - Backend validates:
     - QR token exists and not expired
     - Mobile user is authenticated
   - Backend authorizes the challenge

3. **Desktop Gets Session**
   - Desktop polling detects `authorized` status
   - Desktop calls `/auth/qr-confirm` to get tokens
   - Desktop session created (long-lived)

---

## API Endpoints

### 1. Create QR Challenge (Desktop)

**Endpoint:** `GET /auth/qr-challenge`

**Response:**
```json
{
  "challengeId": "6931532d15860505981457f8",
  "qrPayload": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Details:**
- `challengeId`: Used for polling status
- `qrPayload`: UUID token to display in QR code
- Token expires in **2-5 minutes** (configurable)

---

### 2. Check QR Status (Desktop Polling)

**Endpoint:** `GET /auth/qr-status?challengeId=...`

**Response:**
```json
{
  "status": "pending" | "authorized" | "expired",
  "user": {
    "id": "...",
    "name": "Demo User",
    "avatar": "..."
  }
}
```

**Status Values:**
- `pending`: Waiting for mobile authorization
- `authorized`: Mobile has authorized, desktop can get tokens
- `expired`: Token expired (2-5 minutes)

---

### 3. Scan QR Code (Mobile)

**Endpoint:** `POST /auth/qr-scan`

**Headers:**
```
Authorization: Bearer <mobile-access-token>
```

**Request Body:**
```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "success": true,
  "challengeId": "6931532d15860505981457f8",
  "message": "Desktop session authorized successfully"
}
```

**Requirements:**
- ✅ Mobile must be authenticated (JWT token required)
- ✅ QR token must be valid UUID
- ✅ QR token must not be expired
- ✅ QR token must not be already used

---

### 4. Confirm QR Challenge (Desktop)

**Endpoint:** `POST /auth/qr-confirm`

**Request Body:**
```json
{
  "challengeId": "6931532d15860505981457f8"
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "abc123def456...",
  "user": {
    "id": "...",
    "name": "Demo User",
    "phone": "9033868859",
    "avatarUrl": null
  }
}
```

**Details:**
- Creates **long-lived desktop session**
- Access token: 15 minutes
- Refresh token: 30 days (stored in DB, deviceType: 'desktop')
- Challenge is deleted after use (one-time use)

---

## Token Details

### QR Token (Temporary)
- **Format:** UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- **Lifetime:** 2-5 minutes (configurable)
- **Purpose:** Temporary link between desktop and mobile
- **Storage:** Database (QRChallenge collection)
- **Auto-expires:** MongoDB TTL index

### Desktop Session Tokens (Long-lived)
- **Access Token:** 15 minutes (JWT)
- **Refresh Token:** 30 days (stored in DB)
- **Device Type:** `desktop`
- **Purpose:** Desktop session authentication

---

## Security Features

### Mobile-First Authorization
- ✅ Only authenticated mobile devices can authorize desktop sessions
- ✅ Mobile JWT token required in `Authorization` header
- ✅ Desktop cannot authorize itself

### Token Security
- ✅ QR tokens expire in 2-5 minutes
- ✅ QR tokens are one-time use
- ✅ UUID format prevents guessing
- ✅ Desktop sessions tracked separately from mobile

### Session Management
- ✅ Desktop sessions tied to mobile authorization
- ✅ Each desktop device gets separate refresh token
- ✅ Refresh tokens can be revoked

---

## Configuration

### Environment Variables

```env
# QR Token expiry (2-5 minutes)
QR_TOKEN_TTL_MINUTES=3  # Default: 3 minutes

# Desktop session tokens
JWT_ACCESS_EXPIRES_IN=15m          # Access token lifetime
JWT_REFRESH_EXPIRES_IN=30d        # Refresh token JWT lifetime
REFRESH_TOKEN_EXPIRES_DAYS=30     # Refresh token DB expiration
```

---

## Frontend Implementation

### Desktop (DesktopLoginScreen)

```typescript
// 1. Create QR challenge
const { challengeId, qrPayload } = await createQRChallenge();

// 2. Display QR code (qrPayload is UUID token)
<QRCode value={qrPayload} />

// 3. Poll for status
const pollStatus = async () => {
  const status = await checkQRStatus(challengeId);
  if (status.status === 'authorized') {
    // 4. Get desktop session tokens
    const { accessToken, refreshToken } = await confirmQRChallenge(challengeId);
    // Store tokens and login
  }
};
```

### Mobile (QRScannerScreen)

```typescript
// 1. Scan QR code
const qrData = scannedData; // UUID token

// 2. Parse token
const token = parseQRToken(qrData); // "550e8400-e29b-41d4-a716-446655440000"

// 3. Authorize desktop session (requires mobile JWT)
const result = await scanQRCode(token);
// Mobile JWT is automatically sent in Authorization header
```

---

## Database Schema

### QRChallenge Collection
```typescript
{
  _id: ObjectId,
  token: string (UUID, unique),
  expiresAt: Date (2-5 min from creation),
  authorizedUserId?: ObjectId (set when mobile authorizes),
  createdAt: Date
}
```

### RefreshToken Collection (Desktop Session)
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  token: string (unique),
  deviceType: 'desktop',
  expiresAt: Date (30 days),
  createdAt: Date
}
```

---

## Error Handling

### Common Errors

1. **QR Token Expired**
   - Status: `expired`
   - Solution: Generate new QR code

2. **QR Token Already Used**
   - Error: "Token already used"
   - Solution: Generate new QR code

3. **Mobile Not Authenticated**
   - Error: "Mobile authentication required"
   - Solution: Login on mobile first

4. **Invalid QR Token**
   - Error: "Invalid token"
   - Solution: Scan QR code again

---

## Testing

### Test QR Flow

1. **Desktop:**
   ```bash
   curl http://localhost:3000/auth/qr-challenge
   # Returns: { challengeId, qrPayload: "UUID-token" }
   ```

2. **Mobile (authenticated):**
   ```bash
   curl -X POST http://localhost:3000/auth/qr-scan \
     -H "Authorization: Bearer <mobile-jwt-token>" \
     -H "Content-Type: application/json" \
     -d '{"token":"UUID-token-from-qr"}'
   ```

3. **Desktop:**
   ```bash
   # Check status
   curl http://localhost:3000/auth/qr-status?challengeId=...
   
   # Get tokens (when authorized)
   curl -X POST http://localhost:3000/auth/qr-confirm \
     -H "Content-Type: application/json" \
     -d '{"challengeId":"..."}'
   ```

---

## Summary

✅ **Desktop generates:** Temporary UUID token (2-5 min expiry)  
✅ **QR code displays:** UUID token only  
✅ **Desktop polls:** `/auth/qr-status` every 2 seconds  
✅ **Mobile scans:** Reads UUID token from QR code  
✅ **Mobile sends:** Token + mobile JWT auth token  
✅ **Backend creates:** Long-lived desktop session tokens  

The flow ensures only authenticated mobile devices can authorize desktop sessions, maintaining security while providing seamless device linking.

