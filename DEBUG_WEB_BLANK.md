# Debug: Web Blank Screen - Step by Step

## Current Issue
Screen is completely blank on Chrome even after clearing cache.

## Diagnostic Steps

### 1. Check Browser Console (CRITICAL)
Open DevTools (F12) → Console tab and look for:
- Red error messages
- `registerWebModule` errors
- Import/module errors
- React rendering errors

### 2. Check Network Tab
Open DevTools (F12) → Network tab:
- Are JavaScript files loading? (200 status)
- Any failed requests? (red entries)
- Check `localhost:8081` main request

### 3. Verify Expo Server
```bash
# Check if Expo is running
curl http://localhost:8081

# Should return HTML, not error
```

### 4. Check Terminal Output
Look at the terminal where `expo start --web` is running:
- Any compilation errors?
- Any warnings about missing modules?
- Does it say "Web is waiting on http://localhost:8081"?

## Quick Fixes to Try

### Fix 1: Hard Refresh
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

### Fix 2: Check if React is Rendering
Add this to `App.tsx` temporarily:
```tsx
export default function App() {
  console.log('App component rendering!');
  return <div style={{padding: 20}}>TEST - If you see this, React is working</div>;
}
```

### Fix 3: Verify App.tsx Changes
Make sure `App.tsx` has Platform checks:
```tsx
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  // Native-only imports
}
```

### Fix 4: Check for Import Errors
Look for any imports that might fail on web:
- `@react-native-community/netinfo` (should be conditional)
- `expo-camera` (might need web polyfill)
- Native modules without web support

## Next Steps
1. Share browser console errors
2. Share terminal output from Expo
3. Try the TEST div above to verify React rendering

