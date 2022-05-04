import { model, Schema, Document } from 'mongoose';

export interface IBancorSchema {
  poolProgramAddeddBlockNo?: number;
  newTokenListingBlockNo?: number;
  snapshotTimestamp?: number;
}
const BancorDB = new Schema<IBancorSchema>({
  _id: {
    type: String,
  },
  poolProgramAddeddBlockNo: {
    type: Number,
  },
  newTokenListingBlockNo: {
    type: Number,
  },
  snapshotTimestamp: {
    type: Number,
  },
});

export const BancorModel = model<IBancorSchema>('BancorDB', BancorDB);
