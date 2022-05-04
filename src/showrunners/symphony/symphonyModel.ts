import { model, Schema, Document } from 'mongoose';

export interface ISymphonySchema {
  limitOrderBlockNo?: number;
}
const SymphonyDB = new Schema<ISymphonySchema>({
  _id: {
    type: String,
  },
  limitOrderBlockNo: {
    type: Number,
  },
});

export const SymphonyModel = model<ISymphonySchema>('SymphonyDB', SymphonyDB);
