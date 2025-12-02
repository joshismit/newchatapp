# WhatsApp-like QR Login Flow

## Overview

This app implements a WhatsApp-style QR code login system where:
- **Desktop/Web**: Displays a QR code for login
- **Mobile**: Scans the QR code to authorize desktop login

## Complete Flow

### Desktop/Web Side (QR Code Display)

1. **Initial Screen**: `DesktopLoginScreen` (auto-opens on web)
   - Or navigate from `LoginScreen` → "Login with QR Code" button

2. **QR Code Generation**:
   - Calls `GET /auth/qr-challenge`
   - Receives `{ challengeId, qrPayload }`
   - Displays QR code using `react-native-qrcode-svg`

3. **Status Polling**:
   - Polls `GET /auth/qr-status?challengeId=...` every 2 seconds
   - Shows status: "Waiting for scan...", "Authorized!", or "Expired"

4. **Login Completion**:
   - When status = 'authorized', calls `POST /auth/qr-confirm`
   - Receives JWT token
   - Saves token to AsyncStorage
   - Navigates to `Home` screen

### Mobile Side (QR Scanner)

1. **Access Scanner**:
   - User must be logged in on mobile (has JWT token)
   - Navigate from `LoginScreen` → "Scan QR Code for Desktop Login" button
   - Opens `QRScannerScreen` (modal)

2. **Camera Permission**:
   - Requests camera permission if not granted
   - Shows permission UI if denied

3. **QR Code Scanning**:
   - Uses `expo-camera` CameraView with barcode scanner
   - Scans QR code from desktop
   - Extracts token from QR payload URL

4. **Authorization**:
   - Calls `POST /auth/qr-scan` with:
     - `token`: Extracted from QR code
     - `userId`: Current mobile user's ID
   - Authorization header: `Bearer MOBILE_USER_JWT_TOKEN`

5. **Success**:
   - Shows success alert
   - Navigates back to previous screen
   - Desktop automatically detects authorization and completes login

## Platform Detection

### Web/Desktop
- Initial route: `DesktopLogin`
- LoginScreen shows: "Login with QR Code" button
- Navigates to: `DesktopLoginScreen`

### Mobile (iOS/Android)
- Initial route: `Login`
- LoginScreen shows: "Scan QR Code for Desktop Login" button
- Navigates to: `QRScannerScreen`

## API Endpoints

### Desktop Flow
1. `GET /auth/qr-challenge` - Create QR challenge
2. `GET /auth/qr-status?challengeId=...` - Check status (polling)
3. `POST /auth/qr-confirm` - Get JWT token after authorization

### Mobile Flow
1. `POST /auth/qr-scan` - Authorize desktop login
   - Requires: Authorization header (mobile user's JWT)
   - Body: `{ token, userId }`

## Files

### Frontend
- `screens/DesktopLoginScreen.tsx` - QR code display (desktop)
- `screens/QRScannerScreen.tsx` - QR scanner (mobile)
- `screens/LoginScreen.tsx` - Entry point with platform-aware buttons
- `utils/api.ts` - API functions for QR flow
- `utils/qrParser.ts` - QR payload parsing utilities

### Backend
- `backend/src/controllers/authController.ts` - QR endpoints
- `backend/src/services/authService.ts` - QR challenge logic

## User Experience

### Desktop User
1. Opens app on web/desktop
2. Sees QR code displayed
3. Opens mobile app
4. Scans QR code
5. Desktop automatically logs in

### Mobile User
1. Already logged in on mobile
2. Taps "Scan QR Code for Desktop Login"
3. Grants camera permission (if needed)
4. Scans QR code from desktop
5. Desktop login authorized

## Security

- QR challenges expire after 2 minutes
- Mobile user must be authenticated (JWT required)
- QR tokens are single-use
- Desktop receives JWT token only after mobile authorization

## Error Handling

- QR code expiration (auto-refresh option)
- Camera permission denied
- Invalid QR code format
- Network errors
- Authorization failures

## Testing

See `E2E_TEST_PLAN.md` for complete test scenarios.

