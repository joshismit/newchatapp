# Frontend UI Diagnostic Checklist

## Issue: Blank Screen on Web (localhost:8081)

### ✅ Fixes Applied:

1. **Made native-only screens conditional:**
   - `QRScannerScreen` (uses `expo-camera`) - now only loads on native
   - `DesktopLoginScreen` (uses `react-native-qrcode-svg`) - now only loads on native
   - Added web placeholders for these screens

2. **Added debug logging:**
   - App component now logs "✅ App component mounted!" on mount
   - Check browser console (F12) for this message

3. **Fixed expo-modules-core polyfill:**
   - Added polyfill at top of App.tsx
   - Created standalone polyfill file

### 🔍 Diagnostic Steps:

#### Step 1: Check Browser Console
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for:
   - ✅ "App component mounted!" message
   - ❌ Any red error messages
   - ⚠️ Yellow warnings

#### Step 2: Check Network Tab
1. Open DevTools → Network tab
2. Refresh page (Ctrl+Shift+R)
3. Check if:
   - JavaScript files load (status 200)
   - No failed requests (red entries)
   - Main bundle loads successfully

#### Step 3: Check Terminal Output
Look at Expo server terminal for:
- Compilation errors
- Module resolution errors
- Missing dependency warnings

#### Step 4: Verify React Rendering
If console shows "App component mounted!" but screen is still blank:
- Check if LoginScreen component renders
- Check for CSS/styling issues (white text on white background?)
- Check if NavigationContainer initializes

### 🐛 Common Issues:

1. **Module Import Errors:**
   - Symptom: Red errors in console about missing modules
   - Fix: Ensure all native-only imports are conditional

2. **Navigation Errors:**
   - Symptom: NavigationContainer fails to initialize
   - Fix: Check if all screen components are properly exported

3. **Styling Issues:**
   - Symptom: Components render but are invisible
   - Fix: Check backgroundColor, color props

4. **Metro Bundler Cache:**
   - Symptom: Old cached code runs
   - Fix: Run `npx expo start --web --clear`

### 📋 Next Steps:

1. **Restart Expo with cleared cache:**
   ```bash
   npx expo start --web --clear
   ```

2. **Hard refresh browser:**
   - Windows: Ctrl+Shift+R
   - Mac: Cmd+Shift+R

3. **Check console output:**
   - Share any errors you see
   - Share the "App component mounted!" message if present

4. **If still blank:**
   - Try minimal test: Replace App.tsx content with simple `<View><Text>TEST</Text></View>`
   - If test works, issue is in component tree
   - If test fails, issue is in React setup

