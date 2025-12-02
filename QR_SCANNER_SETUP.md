# QR Scanner Screen Setup

## Overview

The QR Scanner screen allows mobile users to scan QR codes displayed on desktop to authorize desktop login.

## Installation

Install required dependencies:

```bash
npm install expo-camera expo-barcode-scanner
```

## Files Created

1. **`screens/QRScannerScreen.tsx`** - QR scanner screen component
2. **`utils/api.ts`** - API helper functions (includes QR scan endpoint)
3. **`utils/qrParser.ts`** - QR payload parsing utilities

## Features

- ✅ Camera permission handling
- ✅ QR code scanning using expo-camera
- ✅ Token extraction from QR payload URL
- ✅ API integration with POST /auth/qr-scan
- ✅ Error handling and user feedback
- ✅ Beautiful UI with scanning overlay

## Usage

### From LoginScreen

```typescript
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();
navigation.navigate('QRScanner');
```

### With User ID Prop (Optional)

```typescript
<QRScannerScreen userId="user123" />
```

If userId is not provided, it will be loaded from AsyncStorage (stored after mobile login).

## Flow

1. User opens QR Scanner screen
2. Camera permission requested (if not granted)
3. Camera view displayed with scanning overlay
4. User scans QR code from desktop
5. Token extracted from QR payload URL
6. POST /auth/qr-scan called with token and userId
7. Success/error feedback shown
8. User navigated back on success

## QR Payload Format

QR code contains URL:
```
https://YOUR_API/auth/qr-scan?token=XYZ123...
```

The scanner extracts the `token` query parameter.

## API Integration

The scanner calls:
```
POST /auth/qr-scan
Authorization: Bearer MOBILE_USER_JWT_TOKEN
Content-Type: application/json

{
  "token": "extracted-from-qr",
  "userId": "mobile-user-id"
}
```

## User ID Handling

The userId should come from:
1. Props (if passed to component)
2. AsyncStorage (stored after mobile login)
3. User context/auth state (recommended)

**Important**: User must be logged in on mobile before scanning QR codes.

## Environment Variables

Add to your `.env` or `app.json`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Testing

1. Start backend server
2. Create QR challenge on desktop
3. Open QR Scanner on mobile
4. Scan QR code
5. Verify authorization succeeds

## UI Features

- Camera view with scanning frame
- Corner indicators for scanning area
- Loading indicator during authorization
- Error messages for invalid QR codes
- Permission request UI
- Close button to exit scanner

## Error Handling

- Invalid QR code format
- Missing camera permission
- Network errors
- API errors
- Missing user ID

All errors show user-friendly alerts with retry options.

