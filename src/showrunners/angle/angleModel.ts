import { model, Schema, Document } from 'mongoose';

export interface IAngleSchema {
  poolProgramAddeddBlockNo?: number;
  newTokenListingBlockNo?: number;
  snapshotTimestamp?: number;
}
const AngleDB = new Schema<IAngleSchema>({
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

export const AngleModel = model<IAngleSchema>('AngleDB', AngleDB);
