import { Router } from 'express';
import { authController } from '../controllers/authController';

const router = Router();

/**
 * GET /auth/qr-challenge
 * Create a new QR challenge token
 */
router.get('/qr-challenge', authController.createQRChallenge);

/**
 * POST /auth/qr-scan
 * Mobile app scans QR code and authorizes with user ID
 */
router.post('/qr-scan', authController.scanQRCode);

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
