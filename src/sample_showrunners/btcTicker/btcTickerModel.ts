import { model, Schema } from 'mongoose';

export interface BtcTickerUserData {
  _id?: string;
  lastCycle?: number;
  lastBtcPrice?: number;
}

const btcTickerUserSchema = new Schema<BtcTickerUserData>({
  _id: {
    type: String,
  },
  lastCycle: {
    type: Number,
  },
  lastBtcPrice: {
    type: Number
  }
});

export const btcTickerUserModel = model<BtcTickerUserData>('btcTickerUserDB', btcTickerUserSchema);

export interface BtcTickerGlobal {
  _id?: string;
  prevBtcPrice?: number;
  cycles?: number;
}

const btcTickerGlobalSchema = new Schema<BtcTickerGlobal>({
  _id: {
    type: String,
  },
  prevBtcPrice: {
    type: Number,
  },
  cycles: {
    type: Number,
  },
});

export const btcTickerGlobalModel = model<BtcTickerGlobal>('btcTickerGlobalDB', btcTickerGlobalSchema);