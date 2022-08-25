import { model, Schema, Document } from 'mongoose';

export interface INotificationDetails {
  channelName?: string;
  channelAddress?: string;
  date?: Date;
  endDateTime?: Date;
}
const notificationDetailsDB = new Schema<INotificationDetails>({
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
  date: {
    type: Date,
    default: Date.now,
  },
  endDateTime: {
    type: Date,
    default: Date.now,
  },
  notificationCount: {
    type: Number,
    default: 0,
  },
  failedNotificationCount: {
    type: Number,
    default: 0,
  },
});

export const NotificationDetailsModel = model<INotificationDetails>('NotificationDetailsDB', notificationDetailsDB);
