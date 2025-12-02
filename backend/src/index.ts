import express, { Express, Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
// SSE routes
import sseRoutes from './routes/sseRoutes';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://smitjoshi709_db_user:RHLhRJ9PIBaP03yJ@cluster0.qampcyo.mongodb.net/';

// Middleware
app.use(cors());
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
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing MongoDB connection...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

export default app;

