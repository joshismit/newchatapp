# Quick Start: Deploy to Render

## 🚀 5-Minute Deployment Guide

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### Step 2: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Authorize Render to access your repositories

### Step 3: Deploy Web Service

1. **Click "New +" → "Web Service"**

2. **Connect Repository**
   - Select: `newchatapp` repository
   - Click "Connect"

3. **Configure Service**
   - **Name**: `newchatapp-backend`
   - **Environment**: `Node`
   - **Region**: Choose closest region
   - **Branch**: `main`
   - **Root Directory**: `backend` ⚠️ **IMPORTANT**
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free` (or choose paid plan)

4. **Set Environment Variables**
   
   Click "Advanced" → Add these variables:

   ```env
   NODE_ENV=production
   PORT=3000
   MONGO_URI=your-mongodb-atlas-connection-string
   MONGO_DB_NAME=newchatapp
   JWT_SECRET=generate-a-random-secret-key-min-32-chars
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=*
   ```

   **Generate JWT_SECRET:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. **Click "Create Web Service"**
   - Wait for build to complete (5-10 minutes first time)
   - Your service URL will be: `https://newchatapp-backend.onrender.com`

### Step 4: Update API_BASE_URL

After deployment, Render gives you a URL. Update environment variable:

1. Go to your service → "Environment" tab
2. Add/Update:
   ```env
   API_BASE_URL=https://newchatapp-backend.onrender.com
   ```
3. Click "Save Changes" (will auto-redeploy)

### Step 5: Update Frontend

Update your frontend `.env` file:
```env
EXPO_PUBLIC_API_URL=https://newchatapp-backend.onrender.com
```

### Step 6: Test Deployment

```bash
# Test health endpoint
curl https://newchatapp-backend.onrender.com/health

# Should return: {"status":"ok","timestamp":"..."}
```

## ✅ Checklist

- [ ] Code pushed to GitHub
- [ ] Render account created
- [ ] Web service created
- [ ] Root directory set to `backend`
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm start`
- [ ] Environment variables set:
  - [ ] `MONGO_URI`
  - [ ] `MONGO_DB_NAME`
  - [ ] `JWT_SECRET`
  - [ ] `API_BASE_URL` (after first deploy)
  - [ ] `CORS_ORIGIN`
- [ ] Service deployed successfully
- [ ] Health endpoint works
- [ ] Frontend API URL updated

## 🔧 Troubleshooting

**Build fails?**
- Check "Logs" tab for errors
- Verify `backend/` folder structure
- Ensure `package.json` has build script

**Service won't start?**
- Check runtime logs
- Verify `MONGO_URI` is correct
- Check MongoDB Atlas IP whitelist (allow 0.0.0.0/0)

**502 Bad Gateway?**
- Service might be spinning up (free tier)
- Wait 30-60 seconds and retry
- Check logs for errors

## 📝 Important Notes

1. **Free Tier**: Service spins down after 15 min inactivity
2. **First Request**: May take 30-60 seconds to wake up
3. **MongoDB Atlas**: Must allow connections from Render IPs
4. **Environment Variables**: Set `API_BASE_URL` after first deploy

## 🎯 Next Steps

After successful deployment:
1. Test login endpoint
2. Test QR code flow
3. Monitor logs for any issues
4. Update frontend to use Render URL

