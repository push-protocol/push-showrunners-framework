import { model, Schema } from 'mongoose';

export interface PriceTrackerData {
  _id?: string;
  lastCycle?: number;
}

const priceTrackerSchema = new Schema<PriceTrackerData>({
  _id: {
    type: String,
  },
  lastCycle: {
    type: Number,
  },
});

export const priceTrackerModel = model<PriceTrackerData>('priceTrackerUserDB', priceTrackerSchema);

export interface PriceTrackerGlobal {
  _id?: string;
  cycles?: number;
}

const priceTrackerGlobalSchema = new Schema<PriceTrackerGlobal>({
  _id: {
    type: String,
  },
  cycles: {
    type: Number,
  },
});

export const priceTrackerGlobalModel = model<PriceTrackerGlobal>('priceTrackerGlobalDB', priceTrackerGlobalSchema);

export interface PriceTrackerToken {
  _id?: String;
  symbol?: String;
  tokenPrevPrice?: Number;
}

const PriceTrackerTokenSchema = new Schema<PriceTrackerToken>({
  _id: String,
  symbol: String,
  tokenPrevPrice: Number,
});

export const priceTrackerTokenModel = model<PriceTrackerToken>('priceTokenTracker', PriceTrackerTokenSchema);
