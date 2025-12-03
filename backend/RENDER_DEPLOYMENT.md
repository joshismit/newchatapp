# Deploy Backend to Render

This guide will help you deploy the backend API to Render.

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **MongoDB Atlas**: Database connection string ready

## Step 1: Prepare Your Repository

Make sure your backend code is pushed to GitHub and the `backend/` folder is accessible.

## Step 2: Create Web Service on Render

### Option A: Using Render Dashboard (Recommended)

1. **Go to Render Dashboard**
   - Log in to [dashboard.render.com](https://dashboard.render.com)
   - Click "New +" → "Web Service"

2. **Connect Repository**
   - Connect your GitHub account if not already connected
   - Select your repository: `newchatapp`
   - Click "Connect"

3. **Configure Service**
   - **Name**: `newchatapp-backend` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Choose your plan (Free tier available)

4. **Environment Variables**
   Click "Advanced" → "Add Environment Variable" and add:

   ```env
   NODE_ENV=production
   PORT=3000
   MONGO_URI=your-mongodb-connection-string
   MONGO_DB_NAME=newchatapp
   JWT_SECRET=your-secret-key-min-32-characters-long
   JWT_EXPIRES_IN=7d
   API_BASE_URL=https://your-service-name.onrender.com
   CORS_ORIGIN=https://your-frontend-domain.com,http://localhost:19006
   ```

   **Important Variables:**
   - `MONGO_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: Generate a strong secret key (min 32 characters)
   - `API_BASE_URL`: Will be your Render service URL (e.g., `https://newchatapp-backend.onrender.com`)
   - `CORS_ORIGIN`: Your frontend URLs (comma-separated)

5. **Click "Create Web Service"**
   - Render will start building and deploying your service
   - First deployment may take 5-10 minutes

### Option B: Using render.yaml (Alternative)

If you prefer using `render.yaml`:

1. The `render.yaml` file is already created in `backend/` folder
2. In Render Dashboard, go to "New +" → "Blueprint"
3. Connect your repository
4. Render will detect `render.yaml` and create the service
5. **Important**: You still need to set environment variables manually in the dashboard

## Step 3: Configure Environment Variables

After creating the service, go to "Environment" tab and set:

### Required Variables

```env
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=newchatapp
JWT_SECRET=your-very-long-secret-key-at-least-32-characters
JWT_EXPIRES_IN=7d
```

### Important: API_BASE_URL

After deployment, Render will provide a URL like:
```
https://newchatapp-backend.onrender.com
```

Set this as `API_BASE_URL`:
```env
API_BASE_URL=https://newchatapp-backend.onrender.com
```

### CORS Configuration

Set `CORS_ORIGIN` to allow your frontend:
```env
CORS_ORIGIN=https://your-frontend-domain.com,http://localhost:19006
```

For development, you can use:
```env
CORS_ORIGIN=*
```

**Note**: Using `*` allows all origins. For production, specify exact domains.

## Step 4: Update Frontend API URL

After deployment, update your frontend `.env` file:

```env
EXPO_PUBLIC_API_URL=https://newchatapp-backend.onrender.com
```

Or if using environment variables in your frontend deployment, set:
```env
EXPO_PUBLIC_API_URL=https://your-render-service-url.onrender.com
```

## Step 5: Verify Deployment

1. **Check Build Logs**
   - Go to "Logs" tab in Render dashboard
   - Verify build completed successfully
   - Look for: `✅ Connected to MongoDB`
   - Look for: `🚀 Server running on http://localhost:3000`

2. **Test Health Endpoint**
   ```bash
   curl https://your-service-name.onrender.com/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

3. **Test Login Endpoint**
   ```bash
   curl -X POST https://your-service-name.onrender.com/auth/login \
     -H "Content-Type: application/json" \
     -d '{"phone":"9033868859","password":"test1234"}'
   ```

## Step 6: MongoDB Atlas Configuration

Make sure your MongoDB Atlas allows connections from Render:

1. **IP Whitelist**
   - Go to MongoDB Atlas → Network Access
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Or add Render's IP ranges (check Render docs)

2. **Database User**
   - Ensure database user has read/write permissions
   - User credentials should match `MONGO_URI`

## Troubleshooting

### Build Fails

1. **Check Build Logs**
   - Look for TypeScript compilation errors
   - Verify all dependencies are in `package.json`

2. **Common Issues**
   - Missing `MONGO_URI`: Check environment variables
   - Build timeout: Increase build timeout in Render settings
   - Memory issues: Upgrade to a higher plan

### Service Won't Start

1. **Check Runtime Logs**
   - Go to "Logs" tab
   - Look for error messages

2. **Common Issues**
   - Port not set: Render provides PORT via env var (already handled)
   - MongoDB connection failed: Check `MONGO_URI` and IP whitelist
   - Missing environment variables: Verify all required vars are set

### 502 Bad Gateway

- Service might be starting up (first deployment takes time)
- Check if service is running in "Events" tab
- Verify health endpoint responds

### CORS Errors

- Update `CORS_ORIGIN` environment variable
- Include your frontend domain(s)
- For development: `CORS_ORIGIN=*` (not recommended for production)

## Render Free Tier Limitations

- **Spins down after 15 minutes of inactivity**
- **Takes 30-60 seconds to wake up**
- **Limited to 512MB RAM**
- **No persistent storage** (use MongoDB Atlas for data)

## Upgrading to Paid Plan

For production use, consider upgrading:
- **Starter**: $7/month - Always on, 512MB RAM
- **Standard**: $25/month - Always on, 2GB RAM, better performance

## Monitoring

1. **Logs**: Available in Render dashboard
2. **Metrics**: CPU, Memory usage in dashboard
3. **Health Checks**: Render automatically checks `/health` endpoint

## Auto-Deploy

Render automatically deploys when you push to your connected branch:
- Push to `main` → Auto-deploy
- Or configure specific branch in service settings

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment | `production` |
| `PORT` | Yes | Server port | `3000` |
| `MONGO_URI` | Yes | MongoDB connection | `mongodb+srv://...` |
| `MONGO_DB_NAME` | Optional | Database name | `newchatapp` |
| `JWT_SECRET` | Yes | JWT signing secret | `your-secret-key` |
| `JWT_EXPIRES_IN` | Optional | Token expiry | `7d` |
| `API_BASE_URL` | Yes | Your Render URL | `https://...onrender.com` |
| `CORS_ORIGIN` | Yes | Allowed origins | `https://your-app.com` |

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Update frontend API URL
3. ✅ Test login functionality
4. ✅ Test QR code flow
5. ✅ Monitor logs and performance

## Support

- Render Docs: https://render.com/docs
- Render Support: support@render.com
- Check service logs for detailed error messages

