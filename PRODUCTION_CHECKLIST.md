# Production Deployment Checklist

## 📋 Pre-Deployment Checklist

### 1. Environment Variables

#### Required Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
API_URL=https://api.yourdomain.com

# MongoDB (Atlas)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long-use-crypto-random
JWT_EXPIRES_IN=7d

# AWS S3 (for file uploads)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_S3_PRESIGNED_URL_EXPIRY=3600

# Redis (for SSE scaling - optional but recommended)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# CORS
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# File Upload (local fallback)
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes

# Rate Limiting (optional)
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info  # debug, info, warn, error
```

#### Security Best Practices

- ✅ **Never commit `.env` files to version control**
- ✅ **Use strong, randomly generated JWT_SECRET** (min 32 characters)
- ✅ **Rotate secrets regularly**
- ✅ **Use environment-specific values** (dev, staging, prod)
- ✅ **Store secrets in secure vaults** (AWS Secrets Manager, HashiCorp Vault, etc.)

---

### 2. TLS/SSL Certificate Setup

#### Option A: Using Let's Encrypt (Recommended for most cases)

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Obtain certificate
sudo certbot certonly --standalone -d api.yourdomain.com

# Certificates will be stored at:
# /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/api.yourdomain.com/privkey.pem
```

#### Option B: Using Nginx as Reverse Proxy

```nginx
# /etc/nginx/sites-available/api.yourdomain.com
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # SSE specific headers
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400;
    }

    # SSE endpoint specific configuration
    location /sse {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Cache-Control 'no-cache';
        proxy_set_header X-Accel-Buffering 'no';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

#### Option C: Using Node.js with HTTPS (Direct)

```typescript
// backend/src/index.ts (production mode)
import https from 'https';
import fs from 'fs';

if (process.env.NODE_ENV === 'production') {
  const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/api.yourdomain.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/api.yourdomain.com/fullchain.pem'),
  };

  https.createServer(options, app).listen(PORT, () => {
    console.log(`🚀 HTTPS Server running on https://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}
```

#### WSS (WebSocket Secure) - If using WebSockets later

For SSE, HTTPS is sufficient. If you migrate to WebSockets, use WSS:
- Same certificate as HTTPS
- Configure in Nginx with `proxy_set_header Upgrade $http_upgrade;`
- Use `wss://` protocol in client

---

### 3. MongoDB Production Setup (Atlas)

#### Connection String Format

```
mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority&appName=ChatApp
```

#### Recommended Indexes

Create these indexes in MongoDB Atlas or via migration script:

```javascript
// Indexes for Messages collection
db.messages.createIndex({ conversationId: 1, createdAt: -1 });
db.messages.createIndex({ senderId: 1, createdAt: -1 });
db.messages.createIndex({ "deliveredTo": 1 });
db.messages.createIndex({ "readBy": 1 });
db.messages.createIndex({ clientId: 1 }, { unique: true, sparse: true });

// Indexes for Conversations collection
db.conversations.createIndex({ members: 1, lastMessageAt: -1 });
db.conversations.createIndex({ "members": 1, archivedBy: 1 });
db.conversations.createIndex({ lastMessageAt: -1 });

// Indexes for Users collection
db.users.createIndex({ phone: 1 }, { unique: true });
db.users.createIndex({ name: 1 });

// Indexes for QRChallenge collection (TTL index for auto-cleanup)
db.qrchallenges.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.qrchallenges.createIndex({ token: 1 }, { unique: true });
```

#### Atlas Best Practices

- ✅ **Enable MongoDB Atlas Network Access** (whitelist server IPs)
- ✅ **Enable MongoDB Atlas Database Access** (create read/write users)
- ✅ **Enable Backup** (automated daily backups)
- ✅ **Enable Monitoring** (Atlas monitoring dashboard)
- ✅ **Set up Alerts** (for connection issues, slow queries)
- ✅ **Use Connection Pooling** (mongoose default is good)
- ✅ **Enable SSL/TLS** (Atlas requires SSL by default)

#### Connection Options

```typescript
// backend/src/index.ts
mongoose.connect(MONGO_URI, {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
});
```

---

### 4. SSE Scaling with Redis Pub/Sub

#### Problem: Single-Instance SSE Limitation

The current SSE implementation stores clients in memory. In a multi-instance setup:
- Client A connects to Server 1
- Client B connects to Server 2
- When Client A sends a message, Server 1 doesn't know about Client B on Server 2

#### Solution: Redis Pub/Sub

Use Redis to broadcast events across all server instances.

#### Implementation Steps

1. **Install Redis and ioredis**:
```bash
npm install ioredis
npm install --save-dev @types/ioredis
```

2. **Create Redis Service** (`backend/src/services/redisService.ts`):
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

export const redisService = {
  publish: (channel: string, message: string) => {
    return redis.publish(channel, message);
  },
  
  subscribe: (channel: string, callback: (message: string) => void) => {
    const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      password: process.env.REDIS_PASSWORD,
    });
    
    subscriber.subscribe(channel);
    subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        callback(msg);
      }
    });
    
    return () => subscriber.quit();
  },
  
  getClient: () => redis,
};
```

3. **Update SSE Manager** to use Redis:
```typescript
// In backend/src/sse/index.ts
import { redisService } from '../services/redisService';

class SSEManager {
  // ... existing code ...

  constructor() {
    // Subscribe to Redis channels
    redisService.subscribe('sse:user', (message) => {
      const { userId, event, data } = JSON.parse(message);
      this.sendEventToUser(userId, event, data);
    });

    redisService.subscribe('sse:conversation', (message) => {
      const { conversationId, event, data } = JSON.parse(message);
      this.broadcastToConversation(conversationId, event, data);
    });
  }

  sendEventToUser(userId: string, eventName: string, payload: any): void {
    // Local broadcast
    const clientIds = this.userClients.get(userId) || new Set();
    clientIds.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client) {
        this.sendEvent(client, eventName, payload);
      }
    });

    // Publish to Redis for other instances
    redisService.publish('sse:user', JSON.stringify({ userId, event: eventName, data: payload }));
  }

  broadcastToConversation(conversationId: string, eventName: string, payload: any): void {
    // Local broadcast
    const clientIds = this.conversationClients.get(conversationId) || new Set();
    clientIds.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client) {
        this.sendEvent(client, eventName, payload);
      }
    });

    // Publish to Redis for other instances
    redisService.publish('sse:conversation', JSON.stringify({ conversationId, event: eventName, data: payload }));
  }
}
```

#### Redis Production Setup

- ✅ **Use Redis Cloud or AWS ElastiCache** (managed Redis)
- ✅ **Enable Redis AUTH** (password protection)
- ✅ **Enable Redis TLS** (for secure connections)
- ✅ **Set up Redis Persistence** (RDB snapshots or AOF)
- ✅ **Monitor Redis Memory** (set maxmemory policy)
- ✅ **Use Redis Sentinel** (for high availability)

---

### 5. Process Management with PM2

#### Install PM2

```bash
npm install -g pm2
```

#### Create PM2 Ecosystem File

Create `backend/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'chat-api',
      script: './dist/index.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
    },
  ],
};
```

#### PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.js --env production

# Stop application
pm2 stop chat-api

# Restart application
pm2 restart chat-api

# Reload application (zero-downtime)
pm2 reload chat-api

# View logs
pm2 logs chat-api

# Monitor
pm2 monit

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
pm2 save
```

#### PM2 Best Practices

- ✅ **Use cluster mode** for multi-core servers
- ✅ **Set memory limits** (`max_memory_restart`)
- ✅ **Enable logging** (separate error and output logs)
- ✅ **Set up auto-restart** (`autorestart: true`)
- ✅ **Monitor with PM2 Plus** (optional paid monitoring)

---

### 6. Docker Deployment

See `Dockerfile` and `docker-compose.yml` files in the repository.

#### Docker Production Checklist

- ✅ **Use multi-stage builds** (smaller image size)
- ✅ **Run as non-root user** (security)
- ✅ **Use .dockerignore** (exclude unnecessary files)
- ✅ **Set resource limits** (CPU, memory)
- ✅ **Use health checks**
- ✅ **Enable logging** (Docker logging driver)

---

### 7. Security Checklist

- ✅ **Enable CORS** (restrict to specific origins)
- ✅ **Rate Limiting** (prevent abuse)
- ✅ **Input Validation** (validate all user inputs)
- ✅ **SQL Injection Prevention** (use Mongoose, parameterized queries)
- ✅ **XSS Prevention** (sanitize user inputs)
- ✅ **CSRF Protection** (if using cookies)
- ✅ **Helmet.js** (security headers)
- ✅ **JWT Expiration** (short-lived tokens)
- ✅ **Password Hashing** (bcrypt, argon2)
- ✅ **HTTPS Only** (redirect HTTP to HTTPS)
- ✅ **Security Headers** (HSTS, X-Frame-Options, etc.)

---

### 8. Monitoring & Logging

#### Recommended Tools

- **Application Monitoring**: PM2 Plus, New Relic, Datadog
- **Error Tracking**: Sentry, Rollbar
- **Logging**: Winston, Pino (structured logging)
- **Uptime Monitoring**: UptimeRobot, Pingdom
- **Database Monitoring**: MongoDB Atlas Monitoring

#### Health Check Endpoint

Already implemented at `/health`. Use for:
- Load balancer health checks
- Monitoring service checks
- Kubernetes liveness/readiness probes

---

### 9. Backup Strategy

- ✅ **MongoDB Atlas Automated Backups** (daily)
- ✅ **S3 Bucket Versioning** (for file uploads)
- ✅ **Environment Variable Backups** (secure vault)
- ✅ **Code Repository** (Git with tags for releases)

---

### 10. Performance Optimization

- ✅ **Enable Gzip Compression** (Express compression middleware)
- ✅ **CDN for Static Assets** (CloudFront, Cloudflare)
- ✅ **Database Query Optimization** (use indexes, explain plans)
- ✅ **Connection Pooling** (Mongoose default)
- ✅ **Caching** (Redis for frequently accessed data)
- ✅ **Load Balancing** (Nginx, AWS ALB)

---

## 🚀 Deployment Steps

1. **Prepare Environment**
   - [ ] Set all environment variables
   - [ ] Configure MongoDB Atlas
   - [ ] Set up Redis (if using)
   - [ ] Configure AWS S3 (if using)

2. **Build Application**
   ```bash
   cd backend
   npm install
   npm run build
   ```

3. **Set up SSL/TLS**
   - [ ] Obtain SSL certificate
   - [ ] Configure Nginx or Node.js HTTPS

4. **Deploy Application**
   - [ ] Using PM2: `pm2 start ecosystem.config.js --env production`
   - [ ] Using Docker: `docker-compose -f docker-compose.prod.yml up -d`

5. **Verify Deployment**
   - [ ] Check health endpoint: `curl https://api.yourdomain.com/health`
   - [ ] Test SSE connection
   - [ ] Test message sending/receiving
   - [ ] Monitor logs for errors

6. **Post-Deployment**
   - [ ] Set up monitoring alerts
   - [ ] Configure backups
   - [ ] Document deployment process
   - [ ] Set up CI/CD pipeline (optional)

---

## 📝 Notes

- Test all functionality in staging environment first
- Perform load testing before production deployment
- Have a rollback plan ready
- Monitor closely for the first 24-48 hours after deployment
- Keep deployment documentation updated

