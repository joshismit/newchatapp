import mongoose, { Document, Schema } from 'mongoose';

export interface IQRChallenge extends Document {
  _id: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  authorizedUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const QRChallengeSchema = new Schema<IQRChallenge>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index for auto-deletion
    },
    authorizedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Index for faster token lookups
QRChallengeSchema.index({ token: 1 });
QRChallengeSchema.index({ expiresAt: 1 });

export const QRChallenge = mongoose.model<IQRChallenge>('QRChallenge', QRChallengeSchema);

