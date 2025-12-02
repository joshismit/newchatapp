import { Router } from 'express';

const router = Router();

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// TODO: Add your routes here
// router.use('/auth', authRoutes);
// router.use('/chat', chatRoutes);

export default router;

