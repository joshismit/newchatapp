import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /auth/login
 * Login with phone and password
 */
router.post('/login', authController.login);

/**
 * GET /auth/qr-challenge
 * Create a new QR challenge token
 */
router.get('/qr-challenge', authController.createQRChallenge);

/**
 * POST /auth/qr-scan
 * Mobile app scans QR code and authorizes with user ID
 * Requires authentication (JWT token)
 */
router.post('/qr-scan', authenticate, authController.scanQRCode);

/**
 * GET /auth/qr-status?challengeId=...
 * Check QR challenge status
 */
router.get('/qr-status', authController.getQRStatus);

/**
 * POST /auth/qr-confirm
 * Desktop confirms QR challenge and receives JWT token
 */
router.post('/qr-confirm', authController.confirmQRChallenge);

export default router;
