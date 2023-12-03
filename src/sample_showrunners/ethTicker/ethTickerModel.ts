/* eslint-disable prettier/prettier */
import { model, Schema } from 'mongoose';

export interface EthTickerData {
    prevEthPrice?: number;
  }

  const ethTickerSchema = new Schema<EthTickerData>({
    _id: {
      type: String,
    },
    prevEthPrice: {
      type: Number,
    },
  });
  
  export const ethTickerModel = model<EthTickerData>('ethTickerDB', ethTickerSchema);