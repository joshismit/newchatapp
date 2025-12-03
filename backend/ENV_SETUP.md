# Environment Variables Setup

## Required Environment Variables

All MongoDB connection strings must be configured via environment variables. No hardcoded connection strings are allowed in the codebase.

### MongoDB Configuration

1. **MONGO_URI** (Required)
   - MongoDB connection string without database name
   - Example: `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`
   - Or with database: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`

2. **MONGO_DB_NAME** (Optional)
   - Database name to use if not specified in MONGO_URI
   - Example: `newchatapp`
   - If MONGO_URI already contains a database name, this will be ignored

### Example .env File

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=newchatapp

# JWT Configuration
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRES_IN=7d

# API Configuration
API_BASE_URL=http://localhost:3000

# AWS S3 (Optional)
USE_S3=false
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=
S3_REGION=us-east-1

# Redis (Optional)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
```

## How It Works

1. The application reads `MONGO_URI` from environment variables
2. If `MONGO_DB_NAME` is set and `MONGO_URI` doesn't contain a database name, it will be appended automatically
3. If `MONGO_URI` already contains a database name, `MONGO_DB_NAME` is ignored
4. All scripts use the same configuration from environment variables

## Files Using Environment Variables

- `backend/src/index.ts` - Main server
- `backend/src/utils/dbConfig.ts` - Database configuration utility (TypeScript)
- `backend/scripts/dbConfig.js` - Database configuration utility (JavaScript for scripts)
- `backend/scripts/create-demo-user.js` - User creation script
- `backend/scripts/verify-and-create-user.js` - User verification script
- `backend/scripts/check-database.js` - Database check script
- `backend/scripts/create-test-data.js` - Test data creation script
- `backend/scripts/migrate-to-newchatapp.js` - Migration script

## Migration Scripts

For migration scripts that need to connect to different databases:

- `SOURCE_MONGO_URI` - Source database connection string (defaults to MONGO_URI)
- `MONGO_SOURCE_DB_NAME` - Source database name (defaults to 'chatdb')
- `MONGO_URI` - Target database connection string
- `MONGO_DB_NAME` - Target database name (defaults to 'newchatapp')

## Security Notes

- Never commit `.env` files to version control
- Use different credentials for development and production
- Rotate credentials regularly
- Use MongoDB Atlas IP whitelist for additional security

