# API URL Configuration Guide

## Problem: Network Error on Mobile Login

When running the app on a mobile device (physical device or emulator), `http://localhost:3000` won't work because `localhost` refers to the device itself, not your development machine.

## Solution: Configure the Correct API URL

### For Physical Mobile Device

1. **Find your computer's IP address:**
   - Windows: Open Command Prompt and run `ipconfig` - look for "IPv4 Address"
   - Mac/Linux: Open Terminal and run `ifconfig` or `ip addr` - look for your local network IP (usually starts with 192.168.x.x or 10.0.x.x)

2. **Create or update `.env` file in the project root:**
   ```env
   EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:3000
   ```
   Example: `EXPO_PUBLIC_API_URL=http://192.168.1.100:3000`

3. **Make sure your backend server is running:**
   ```bash
   cd backend
   npm run dev
   ```

4. **Ensure your firewall allows connections on port 3000**

### For Android Emulator

Use `10.0.2.2` instead of `localhost`:
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

### For iOS Simulator

Use `localhost` (it works on iOS simulator):
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### For Web/Desktop

Use `localhost`:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Quick Setup Steps

1. **Check if backend is running:**
   ```bash
   cd backend
   npm run dev
   ```
   You should see: `🚀 Server running on http://localhost:3000`

2. **Find your IP address** (for physical device):
   - Windows: `ipconfig | findstr IPv4`
   - Mac/Linux: `ifconfig | grep "inet "`

3. **Create `.env` file** in project root:
   ```env
   EXPO_PUBLIC_API_URL=http://YOUR_IP:3000
   ```

4. **Restart Expo/React Native:**
   - Stop the current process (Ctrl+C)
   - Clear cache: `npx expo start -c`
   - Or restart your development server

## Testing the Connection

1. Open the app
2. Try to login
3. Check the console logs - you should see: `Attempting login to: http://YOUR_IP:3000`
4. If you still get network errors, verify:
   - Backend server is running
   - IP address is correct
   - Firewall allows port 3000
   - Device and computer are on the same network

## Troubleshooting

### "Network Error" or "ECONNREFUSED"
- ✅ Backend server is running
- ✅ Correct IP address in `.env`
- ✅ Firewall allows port 3000
- ✅ Device and computer on same network

### "Cannot connect to server"
- Check backend logs for errors
- Verify MongoDB connection
- Check if port 3000 is already in use

### Still not working?
1. Test backend directly: Open browser and go to `http://YOUR_IP:3000/health`
2. Should return: `{"status":"ok","timestamp":"..."}`
3. If this doesn't work, the backend isn't accessible from your device

