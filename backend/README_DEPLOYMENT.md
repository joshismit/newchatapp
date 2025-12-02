# Deployment Guide

## Quick Start

### Development (Docker Compose)

```bash
# Start all services (API, MongoDB, Redis)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Production (PM2)

```bash
# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# View logs
pm2 logs chat-api

# Monitor
pm2 monit
```

### Production (Docker)

```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale API instances
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

## Environment Variables

See `PRODUCTION_CHECKLIST.md` for complete list of environment variables.

Create a `.env` file in the `backend/` directory:

```bash
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
# ... (see PRODUCTION_CHECKLIST.md)
```

## MongoDB Indexes

Run the index creation script:

```bash
# Using mongosh
mongosh "mongodb+srv://..." < mongo-init.js

# Or manually in MongoDB Atlas
# Copy contents of mongodb-indexes.md
```

## SSL/TLS Setup

See `PRODUCTION_CHECKLIST.md` section 2 for detailed SSL/TLS setup instructions.

## SSE Scaling with Redis

If deploying multiple API instances, enable Redis pub/sub for SSE:

1. Set `REDIS_URL` environment variable
2. Install Redis service (see `PRODUCTION_CHECKLIST.md` section 4)
3. Update SSE manager to use Redis (implementation provided in checklist)

## Health Checks

- Health endpoint: `GET /health`
- Returns: `{ status: 'ok', timestamp: '...' }`

Use for:
- Load balancer health checks
- Kubernetes liveness/readiness probes
- Monitoring service checks

## Monitoring

- **PM2**: `pm2 monit` or PM2 Plus dashboard
- **Docker**: `docker stats`
- **MongoDB**: Atlas Monitoring Dashboard
- **Redis**: Redis Insight or `redis-cli monitor`

## Troubleshooting

### API won't start
- Check MongoDB connection string
- Verify all environment variables are set
- Check logs: `pm2 logs` or `docker-compose logs`

### SSE connections dropping
- Check Redis connection (if using)
- Verify CORS settings
- Check Nginx/proxy timeout settings (should be high for SSE)

### High memory usage
- Reduce PM2 instances: `instances: 2` instead of `'max'`
- Set memory limit: `max_memory_restart: '512M'`
- Check for memory leaks in code

### Slow queries
- Verify MongoDB indexes are created
- Check Atlas Performance Advisor
- Review query execution plans

## Support

For detailed production deployment checklist, see `PRODUCTION_CHECKLIST.md`.

