# Fix CORS Network Error on Render

## Problem
Getting `ERR_NETWORK` error when trying to connect to Render deployment:
```
ERROR Login API error: {"code": "ERR_NETWORK", "message": "Network Error", ...}
```

## Root Cause
The backend CORS configuration was blocking requests when `CORS_ORIGIN` environment variable was not set in production.

## Solution

### Option 1: Set CORS_ORIGIN in Render (Recommended)

1. Go to your Render Dashboard
2. Select your service: `newchatapp-backend`
3. Go to "Environment" tab
4. Add/Update environment variable:

   **For Mobile Apps (React Native/Expo):**
   ```
   CORS_ORIGIN=*
   ```

   **For Web Apps (specify exact domains):**
   ```
   CORS_ORIGIN=https://your-frontend-domain.com,http://localhost:19006
   ```

5. Click "Save Changes"
6. Render will automatically redeploy

### Option 2: Code Already Fixed

The code has been updated to allow all origins by default in production (for mobile apps). However, it's still recommended to set `CORS_ORIGIN` explicitly.

## Verify Fix

After setting `CORS_ORIGIN`:

1. Wait for Render to redeploy (check "Events" tab)
2. Test the API endpoint:
   ```bash
   curl https://newchatapp-backend-x9ri.onrender.com/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

3. Test login from your mobile app
   - Should no longer get `ERR_NETWORK` error
   - Should connect successfully

## Additional Checks

If still getting errors:

1. **Check Render Logs**
   - Go to "Logs" tab in Render dashboard
   - Look for any errors or warnings

2. **Verify Service is Running**
   - Check "Metrics" tab - CPU/Memory should show activity
   - Free tier services spin down after 15 min inactivity
   - First request after spin-down takes 30-60 seconds

3. **Check Environment Variables**
   - Verify all required variables are set:
     - `MONGO_URI`
     - `JWT_SECRET`
     - `NODE_ENV=production`
     - `PORT=3000`

4. **Test Health Endpoint**
   ```bash
   curl https://newchatapp-backend-x9ri.onrender.com/health
   ```

## Mobile App Configuration

Make sure your mobile app `.env` file has:

```env
EXPO_PUBLIC_API_URL=https://newchatapp-backend-x9ri.onrender.com
```

Then restart your Expo app:
```bash
# Stop current Expo server
# Then restart
npm start
```

## Notes

- **CORS for Mobile Apps**: React Native/Expo apps don't enforce CORS like browsers do, but the server still needs to accept the requests
- **Free Tier**: Render free tier services spin down after inactivity - first request may be slow
- **HTTPS**: Render provides HTTPS automatically - use `https://` URLs

## Still Having Issues?

1. Check Render service status (should be "Live")
2. Check build logs for any compilation errors
3. Check runtime logs for server errors
4. Verify MongoDB connection is working
5. Test with Postman/curl to isolate mobile app issues

