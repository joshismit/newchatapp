import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { signToken } from '../utils/jwt';

export class AuthController {
  /**
   * GET /auth/qr-challenge
   * Create a new QR challenge
   */
  createQRChallenge = async (req: Request, res: Response): Promise<void> => {
    try {
      // Get API base URL from request or environment
      const protocol = req.protocol;
      const host = req.get('host') || 'localhost:3000';
      const apiBaseUrl = process.env.API_BASE_URL || `${protocol}://${host}`;

      const result = await authService.createQRChallenge(apiBaseUrl);

      res.json(result);
    } catch (error) {
      console.error('Error creating QR challenge:', error);
      res.status(500).json({ error: 'Failed to create QR challenge' });
    }
  };

  /**
   * POST /auth/qr-scan
   * Mobile app scans QR code and authorizes
   * Token can come from query params (QR URL) or request body
   */
  scanQRCode = async (req: Request, res: Response): Promise<void> => {
    try {
      // Token can be in query params (from QR URL) or body
      const token = (req.query.token as string) || req.body.token;

      if (!token || typeof token !== 'string') {
        res.status(400).json({ error: 'Token is required' });
        return;
      }

      // Get userId from authenticated user (assuming middleware sets req.user)
      // For now, we'll expect it in the request body
      // In production, use authentication middleware to set req.user
      const userId = (req as any).user?.id || req.body.userId;

      if (!userId) {
        res.status(401).json({ error: 'User authentication required. Provide userId in request body.' });
        return;
      }

      const result = await authService.scanQRCode(token, userId);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({ success: true, challengeId: result.challengeId });
    } catch (error) {
      console.error('Error scanning QR code:', error);
      res.status(500).json({ error: 'Failed to scan QR code' });
    }
  };

  /**
   * GET /auth/qr-status
   * Check QR challenge status
   */
  getQRStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { challengeId } = req.query;

      if (!challengeId || typeof challengeId !== 'string') {
        res.status(400).json({ error: 'challengeId is required' });
        return;
      }

      const status = await authService.getQRStatus(challengeId);

      res.json(status);
    } catch (error) {
      console.error('Error getting QR status:', error);
      res.status(500).json({ error: 'Failed to get QR status' });
    }
  };

  /**
   * POST /auth/qr-confirm
   * Desktop confirms QR challenge and gets JWT token
   */
  confirmQRChallenge = async (req: Request, res: Response): Promise<void> => {
    try {
      const { challengeId } = req.body;

      if (!challengeId || typeof challengeId !== 'string') {
        res.status(400).json({ error: 'challengeId is required' });
        return;
      }

      const result = await authService.confirmQRChallenge(challengeId);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      // Create JWT token
      const jwtToken = signToken({ userId: result.token! });

      res.json({
        success: true,
        token: jwtToken,
        user: {
          id: result.token,
        },
      });
    } catch (error) {
      console.error('Error confirming QR challenge:', error);
      res.status(500).json({ error: 'Failed to confirm QR challenge' });
    }
  };
}

export const authController = new AuthController();
