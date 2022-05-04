import { model, Schema, Document } from 'mongoose';

export interface IIdleSchema {
  proposalCreatedBlockNo?: number;
}
const IdleDB = new Schema<IIdleSchema>({
  _id: {
    type: String,
  },
  proposalCreatedBlockNo: {
    type: Number,
  },
});

export const IdleModel = model<IIdleSchema>('IdleDB', IdleDB);
