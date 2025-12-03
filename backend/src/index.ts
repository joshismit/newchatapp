import express, { Express, Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
// SSE routes
import sseRoutes from './routes/sseRoutes';
import { getMongoURI } from './utils/dbConfig';

dotenv.config();

const app: Express = express();
// Render provides PORT via environment variable
const PORT = process.env.PORT || 3000;
// MongoDB connection - uses MONGO_URI from environment variables
const MONGO_URI = getMongoURI();

// Middleware
// CORS configuration - allow all origins in development, specific origins in production
const corsOptions = {
  origin: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map((origin: string) => origin.trim())
    : process.env.NODE_ENV === 'production' 
      ? false // Deny all in production if CORS_ORIGIN not set
      : true, // Allow all in development
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve uploaded files (for local development)
import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
import authRoutes from './routes/authRoutes';
import messageRoutes from './routes/messageRoutes';
import conversationRoutes from './routes/conversationRoutes';
import attachmentRoutes from './routes/attachmentRoutes';
app.use('/auth', authRoutes);
app.use('/sse', sseRoutes);
app.use('/messages', messageRoutes);
app.use('/conversations', conversationRoutes);
app.use('/attachments', attachmentRoutes);
// app.use('/api/chat', chatRoutes);

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    const dbName = mongoose.connection.db?.databaseName || 'unknown';
    console.log(`✅ Connected to MongoDB`);
    console.log(`📦 Database: ${dbName}`);
    console.log(`🔗 Connection state: ${mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'}`);
    
    // List collections to verify database setup
    mongoose.connection.db?.listCollections().toArray()
      .then((collections) => {
        if (collections.length > 0) {
          console.log(`📚 Collections found: ${collections.map(c => c.name).join(', ')}`);
        } else {
          console.log(`⚠️  No collections found. Database will be created when first document is saved.`);
        }
      })
      .catch((err) => {
        console.warn('⚠️  Could not list collections:', err.message);
      });
    
    // Start server
    // Render automatically provides PORT via environment variable
    // Listen on all interfaces (0.0.0.0) for Render deployment
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0';
    app.listen(PORT, host, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🌐 Server accessible from network on port ${PORT}`);
        console.log(`📱 For Android emulator, use: http://10.0.2.2:${PORT}`);
      }
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing MongoDB connection...');
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

export default app;

