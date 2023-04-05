import { model, Schema } from 'mongoose';

export interface IAnalyticsLog {
  channelName: string;
  channelAddress?: string;
  functionName?: string;
  sentNotificationCount?: number;
  failedNotificationCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const AnalyticsLogDB = new Schema<IAnalyticsLog>(
  {
    channelName: {
      type: String,
    },
    channelAddress: {
      type: String,
    },
    functionName: {
      type: String,
      default: '',
    },
    sentNotificationCount: {
      type: Number,
      default: 0,
    },
    failedNotificationCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: 'startedAt', updatedAt: 'endedAt' },
  },
);

export const NotificationDetailsModel = model<IAnalyticsLog>('AnalyticsLog', AnalyticsLogDB);
