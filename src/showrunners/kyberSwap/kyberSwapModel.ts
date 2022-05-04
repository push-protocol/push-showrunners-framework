import { model, Schema, Document } from 'mongoose';

export interface IKyberSchema {
  newProposalBlockNo?: number;
  newBinaryProposalBlockNo?: number;
}
const KyberDB = new Schema<IKyberSchema>({
  _id: {
    type: String,
  },
  newProposalBlockNo: {
    type: Number,
  },
  newBinaryProposalBlockNo: {
    type: Number,
  },
});

export const KyberModel = model<IKyberSchema>('KyberDB', KyberDB);
