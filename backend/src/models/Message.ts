import mongoose, { Document, Schema } from 'mongoose';

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export interface IMessageAttachment {
  type: string;
  url: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  text?: string;
  attachments?: IMessageAttachment[];
  clientId?: string; // Client-side generated ID (nanoid)
  status: MessageStatus;
  createdAt: Date;
  deliveredTo: mongoose.Types.ObjectId[];
  readBy: mongoose.Types.ObjectId[];
}

const MessageAttachmentSchema = new Schema<IMessageAttachment>(
  {
    type: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    mimeType: {
      type: String,
    },
  },
  {
    _id: false,
  }
);

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: {
      type: String,
      trim: true,
      default: null,
    },
    attachments: {
      type: [MessageAttachmentSchema],
      default: [],
    },
    clientId: {
      type: String,
      index: true,
      sparse: true, // Allows null/undefined but indexes when present
    },
    status: {
      type: String,
      enum: Object.values(MessageStatus),
      required: true,
      default: MessageStatus.SENDING,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    deliveredTo: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: false,
  }
);

// Compound index for efficient conversation message queries
MessageSchema.index({ conversationId: 1, createdAt: -1 });

// Index for client-side message lookup
MessageSchema.index({ clientId: 1 }, { unique: true, sparse: true });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);

