# Debug: Blank Screen Fix

## Problem
Blank screen with error: `registerWebModule is not a function`

## Root Cause
The error occurs because `expo-modules-core` web module registration isn't working properly. This is a common issue with Expo SDK 50 when running on web.

## Solution

### Step 1: Clear Cache and Restart
```bash
# Stop the current dev server (Ctrl+C)

# Clear Metro bundler cache
npx expo start --clear

# Or manually clear cache
rm -rf node_modules/.cache
rm -rf .expo
```

### Step 2: Verify Dependencies
The following packages should be installed:
- `expo-modules-core@~1.11.0` (already added to package.json)
- `@expo/vector-icons@^14.0.0`
- `expo@~50.0.0`

### Step 3: Restart Dev Server
```bash
npm run web
# or
npx expo start --web
```

## Why This Happens

1. **Metro Bundler Cache**: Old cached modules may not include web polyfills
2. **Module Loading Order**: `expo-modules-core` needs to initialize before other Expo modules
3. **Web Build Configuration**: Expo web builds require proper module registration

## Alternative Fix (If Above Doesn't Work)

If the issue persists, try:

1. **Reinstall node_modules**:
```bash
rm -rf node_modules
npm install
```

2. **Check for conflicting packages**:
```bash
npm list expo-modules-core
```

3. **Use Expo CLI directly**:
```bash
npx expo start --web --clear
```

## Expected Behavior After Fix

- Screen should render properly
- No `registerWebModule` errors in console
- Icons from `@expo/vector-icons` should display correctly

