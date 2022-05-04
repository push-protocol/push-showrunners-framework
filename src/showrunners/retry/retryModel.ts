import { model, Schema, Document } from 'mongoose';
const DelegateSnapshot = new Schema(
  {
    payload: {
      type: Object,
      required: true,
    },
    lastAttempted: {
      type: Date,
    },
    retryCount: {
      type: Number,
      default: 0
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

export default model<Document>('FailedNotifications', DelegateSnapshot);
