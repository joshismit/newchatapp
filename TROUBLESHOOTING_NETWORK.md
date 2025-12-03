# Troubleshooting Network Connection Issues

## Current Issue: ERR_NETWORK on Android Emulator

If you're getting `ERR_NETWORK` when trying to connect to `http://10.0.2.2:3000`, try these solutions:

## Solution 1: Restart Backend Server

The server needs to be restarted to listen on all interfaces:

```bash
cd backend
# Stop the current server (Ctrl+C)
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:3000
🌐 Server accessible from network on port 3000
📱 For Android emulator, use: http://10.0.2.2:3000
```

## Solution 2: Check Windows Firewall

Windows Firewall might be blocking the connection:

1. **Open Windows Defender Firewall**
2. **Click "Allow an app or feature through Windows Defender Firewall"**
3. **Click "Change Settings"** (if needed)
4. **Find "Node.js"** in the list
   - If not found, click "Allow another app" → Browse → Find `node.exe` (usually in `C:\Program Files\nodejs\`)
5. **Check both "Private" and "Public"** checkboxes
6. **Click OK**

Or temporarily disable firewall for testing (not recommended for production).

## Solution 3: Use Your Computer's IP Address

Instead of `10.0.2.2`, try using your computer's actual IP address:

1. **Your IP address is:** `10.14.204.100`

2. **Create or update `.env` file** in project root:
   ```env
   EXPO_PUBLIC_API_URL=http://10.14.204.100:3000
   ```

3. **Restart Expo:**
   ```bash
   npx expo start -c
   ```

## Solution 4: Test Connection Manually

Test if the server is accessible:

### From Android Emulator Browser:
1. Open browser in Android emulator
2. Go to: `http://10.0.2.2:3000/health`
3. Should see: `{"status":"ok","timestamp":"..."}`

### From Command Line (PowerShell):
```powershell
# Test localhost
curl http://localhost:3000/health

# Test with IP
curl http://10.14.204.100:3000/health
```

## Solution 5: Check Android Emulator Network

1. **Verify emulator is running:**
   - Open Android Studio → AVD Manager
   - Make sure emulator is running

2. **Check emulator network settings:**
   - Settings → Network & Internet → Check if connected

3. **Try different emulator:**
   - Sometimes restarting the emulator helps

## Solution 6: Use Physical Device Instead

If emulator continues to have issues:

1. **Find your computer's IP:** `10.14.204.100`
2. **Create `.env` file:**
   ```env
   EXPO_PUBLIC_API_URL=http://10.14.204.100:3000
   ```
3. **Make sure device and computer are on same WiFi network**
4. **Restart Expo:** `npx expo start -c`

## Quick Checklist

- [ ] Backend server is running (`npm run dev` in backend folder)
- [ ] Server shows "Server accessible from network on port 3000"
- [ ] Windows Firewall allows Node.js
- [ ] Tested `http://localhost:3000/health` works
- [ ] Restarted Expo with cache clear: `npx expo start -c`
- [ ] Checked console logs for actual API URL being used

## Still Not Working?

1. **Check backend logs** for any errors
2. **Check Expo console** for network errors
3. **Try using your IP address** instead of 10.0.2.2
4. **Restart everything:**
   - Stop backend (Ctrl+C)
   - Stop Expo (Ctrl+C)
   - Restart backend: `cd backend && npm run dev`
   - Restart Expo: `npx expo start -c`

