import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { QRChallenge, IQRChallenge } from '../models/QRChallenge';
import { User, IUser } from '../models/User';
import { generateQRToken } from '../utils/tokenGenerator';

const QR_TOKEN_TTL_MINUTES = 2;

export interface QRChallengeResponse {
  challengeId: string;
  qrPayload: string;
}

export interface QRStatusResponse {
  status: 'pending' | 'authorized' | 'expired';
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export class AuthService {
  /**
   * Login with phone and password
   */
  async login(phone: string, password: string): Promise<{ success: boolean; user?: IUser; error?: string }> {
    try {
      const trimmedPhone = phone.trim();
      console.log('Login attempt:', { phone: trimmedPhone, passwordLength: password.length });
      
      // Find user by phone
      const user = await User.findOne({ phone: trimmedPhone });
      
      if (!user) {
        console.log('User not found for phone:', trimmedPhone);
        // Debug: Check what users exist
        const allUsers = await User.find({}).select('phone name').limit(5);
        console.log('Available users:', allUsers.map(u => ({ phone: u.phone, name: u.name })));
        return { success: false, error: 'Invalid phone number or password' };
      }
      
      console.log('User found:', { id: user._id, phone: user.phone, name: user.name, hasPassword: !!user.password });

      // Check if user has a password
      if (!user.password) {
        return { success: false, error: 'User account not set up. Please contact support.' };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('Password verification:', isPasswordValid);
      
      if (!isPasswordValid) {
        return { success: false, error: 'Invalid phone number or password' };
      }

      // Return user (password will be excluded by toObject)
      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  /**
   * Create a new QR challenge
   */
  async createQRChallenge(apiBaseUrl: string): Promise<QRChallengeResponse> {
    const token = generateQRToken();
    const expiresAt = new Date(Date.now() + QR_TOKEN_TTL_MINUTES * 60 * 1000);

    const challenge = await QRChallenge.create({
      token,
      expiresAt,
    });

    const qrPayload = `${apiBaseUrl}/auth/qr-scan?token=${token}`;

    return {
      challengeId: challenge._id.toString(),
      qrPayload,
    };
  }

  /**
   * Scan QR code and authorize with user ID
   */
  async scanQRCode(
    token: string,
    userId: string
  ): Promise<{ success: boolean; challengeId?: string; error?: string }> {
    const challenge = await QRChallenge.findOne({ token });

    if (!challenge) {
      return { success: false, error: 'Invalid token' };
    }

    // Check if expired
    if (new Date() > challenge.expiresAt) {
      return { success: false, error: 'Token expired' };
    }

    // Check if already authorized
    if (challenge.authorizedUserId) {
      return { success: false, error: 'Token already used' };
    }

    // Authorize the challenge
    challenge.authorizedUserId = new mongoose.Types.ObjectId(userId);
    await challenge.save();

    return {
      success: true,
      challengeId: challenge._id.toString(),
    };
  }

  /**
   * Get QR challenge status
   */
  async getQRStatus(challengeId: string): Promise<QRStatusResponse> {
    const challenge = await QRChallenge.findById(challengeId);

    if (!challenge) {
      return { status: 'expired' };
    }

    // Check if expired
    if (new Date() > challenge.expiresAt) {
      return { status: 'expired' };
    }

    // Check if authorized
    if (challenge.authorizedUserId) {
      const user = await User.findById(challenge.authorizedUserId);
      if (user) {
        return {
          status: 'authorized',
          user: {
            id: user._id.toString(),
            name: user.name,
            avatar: user.avatarUrl || undefined,
          },
        };
      }
    }

    return { status: 'pending' };
  }

  /**
   * Confirm QR challenge and get session token
   */
  async confirmQRChallenge(
    challengeId: string
  ): Promise<{ success: boolean; token?: string; user?: IUser; error?: string }> {
    const challenge = await QRChallenge.findById(challengeId);

    if (!challenge) {
      return { success: false, error: 'Invalid challenge' };
    }

    // Check if expired
    if (new Date() > challenge.expiresAt) {
      return { success: false, error: 'Challenge expired' };
    }

    // Check if authorized
    if (!challenge.authorizedUserId) {
      return { success: false, error: 'Challenge not authorized' };
    }

    // Get user information
    const user = await User.findById(challenge.authorizedUserId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Delete challenge (one-time use)
    await QRChallenge.findByIdAndDelete(challengeId);

    return {
      success: true,
      token: challenge.authorizedUserId.toString(), // Return user ID, JWT will be created in controller
      user, // Return user object for frontend
    };
  }
}

export const authService = new AuthService();
