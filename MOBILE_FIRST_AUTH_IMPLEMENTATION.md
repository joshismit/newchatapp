# Mobile-First Authentication Implementation

## Overview

This implementation follows a **mobile-first authentication** pattern where:
- **Mobile** is the MASTER device (only mobile can authenticate)
- **Desktop/Web** connects via QR code scanning (authorized by mobile)
- **No passwords** - OTP-based authentication only
- **Refresh tokens** stored in database for session management

---

## Architecture

### 1. Authentication Flow

#### Mobile (Master Device)
1. User enters phone number → OTP screen
2. User enters OTP (`test123` by default)
3. Backend verifies OTP and generates:
   - **Access Token** (short-lived, 15 minutes)
   - **Refresh Token** (long-lived, 30 days, stored in DB)
4. Mobile stores both tokens

#### Desktop/Web (Secondary Device)
1. Desktop displays QR code
2. Mobile scans QR code (requires mobile to be logged in)
3. Mobile authorizes desktop session
4. Desktop receives:
   - **Access Token** (short-lived)
   - **Refresh Token** (stored in DB, deviceType: 'desktop')

---

## Database Models

### User Model
- **No password required** (password field is optional)
- Phone number is unique identifier
- OTP verification replaces password

### RefreshToken Model (New)
```typescript
{
  userId: ObjectId,
  token: string (unique),
  deviceId?: string,
  deviceType: 'mobile' | 'desktop',
  expiresAt: Date,
  createdAt: Date
}
```

**Features:**
- Auto-expires after 30 days (MongoDB TTL index)
- Tracks device type (mobile vs desktop)
- One refresh token per device/session

---

## API Endpoints

### Mobile Authentication

#### `POST /auth/verify-otp`
**Mobile only** - Master device authentication

**Request:**
```json
{
  "phone": "9033868859",
  "otp": "test123",
  "deviceId": "optional-device-id"
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

#### `POST /auth/refresh-token`
Refresh access token using refresh token

**Request:**
```json
{
  "refreshToken": "abc123def456..."
}
```

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### `POST /auth/logout`
Revoke refresh token (logout)

**Request:**
```json
{
  "refreshToken": "abc123def456..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Desktop Authentication (QR Code)

#### `GET /auth/qr-challenge`
Create QR challenge (Desktop)

**Response:**
```json
{
  "challengeId": "...",
  "qrPayload": "http://localhost:3000/auth/qr-scan?token=..."
}
```

#### `POST /auth/qr-scan`
**Mobile only** - Scan QR code and authorize desktop (requires mobile JWT)

**Headers:**
```
Authorization: Bearer <mobile-access-token>
```

**Request:**
```json
{
  "token": "qr-token-from-qr-code"
}
```

**Response:**
```json
{
  "success": true,
  "challengeId": "..."
}
```

#### `POST /auth/qr-confirm`
Desktop confirms QR challenge and gets tokens

**Request:**
```json
{
  "challengeId": "..."
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

---

## Token Management

### Access Token
- **Lifetime:** 15 minutes (configurable via `JWT_ACCESS_EXPIRES_IN`)
- **Purpose:** API authentication
- **Storage:** Client-side (mobile/desktop)
- **Type:** JWT

### Refresh Token
- **Lifetime:** 30 days (configurable via `REFRESH_TOKEN_EXPIRES_DAYS`)
- **Purpose:** Generate new access tokens
- **Storage:** Database (RefreshToken collection)
- **Type:** Random string (not JWT)

### Token Refresh Flow
1. Access token expires
2. Client sends refresh token to `/auth/refresh-token`
3. Backend validates refresh token (checks DB)
4. Backend generates new access token
5. Client uses new access token

---

## Security Features

### Mobile-First Authentication
- ✅ Only mobile can authenticate new sessions
- ✅ Desktop sessions require mobile authorization
- ✅ QR code scanning requires mobile to be logged in

### Token Security
- ✅ Refresh tokens stored in database
- ✅ Refresh tokens auto-expire (MongoDB TTL)
- ✅ Refresh tokens can be revoked (logout)
- ✅ Device type tracking (mobile vs desktop)

### Session Management
- ✅ Multiple devices per user supported
- ✅ Each device has separate refresh token
- ✅ Desktop sessions tied to mobile authorization

---

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-secret-key-min-32-characters
JWT_ACCESS_EXPIRES_IN=15m          # Access token lifetime
JWT_REFRESH_EXPIRES_IN=30d        # Refresh token JWT lifetime
REFRESH_TOKEN_EXPIRES_DAYS=30     # Refresh token DB expiration
```

---

## Frontend Implementation Notes

### Mobile App
1. Store `accessToken` and `refreshToken` after login
2. Use `accessToken` for API requests
3. When access token expires (401), use `refreshToken` to get new access token
4. On logout, call `/auth/logout` to revoke refresh token

### Desktop App
1. Display QR code from `/auth/qr-challenge`
2. Poll `/auth/qr-status` to check if authorized
3. When authorized, call `/auth/qr-confirm` to get tokens
4. Store tokens same as mobile

---

## Migration Notes

### Removing Password Dependencies
- ✅ Password field is optional in User model
- ✅ OTP verification replaces password authentication
- ✅ Existing users can still have passwords (for backward compatibility)
- ✅ New users don't need passwords

### Database Changes
- ✅ New `RefreshToken` collection created automatically
- ✅ TTL index on `expiresAt` field (auto-cleanup)
- ✅ Indexes on `userId`, `token`, `deviceType` for performance

---

## Testing

### Test Mobile Login
```bash
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"9033868859","otp":"test123"}'
```

### Test Refresh Token
```bash
curl -X POST http://localhost:3000/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

### Test QR Flow
1. Desktop: `GET /auth/qr-challenge` → Get QR code
2. Mobile: `POST /auth/qr-scan` (with mobile JWT) → Authorize
3. Desktop: `POST /auth/qr-confirm` → Get tokens

---

## Next Steps

1. ✅ Backend implementation complete
2. ⏳ Update frontend to handle refresh tokens
3. ⏳ Implement token refresh logic in API client
4. ⏳ Update storage to save refresh tokens
5. ⏳ Test end-to-end flow

---

## Files Changed

### Backend
- `backend/src/models/RefreshToken.ts` - New model
- `backend/src/models/index.ts` - Export RefreshToken
- `backend/src/utils/jwt.ts` - Access/refresh token generation
- `backend/src/services/authService.ts` - Token management
- `backend/src/controllers/authController.ts` - New endpoints
- `backend/src/routes/authRoutes.ts` - New routes

### Frontend (To Be Updated)
- `utils/api.ts` - Handle refresh tokens
- `screens/LoginScreen.tsx` - Store refresh tokens
- `screens/DesktopLoginScreen.tsx` - Handle refresh tokens

