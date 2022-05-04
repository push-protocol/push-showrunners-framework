/* eslint-disable prettier/prettier */
import { model, Schema, Document } from 'mongoose';

export interface ImStableData {
  snapshotProposalLatestTimestamp?: number;
  snapshotProposalEndedTimestamp?: number;
}

const mStableSchema = new Schema<ImStableData>({
  _id: {
    type: String,
  },
  snapshotProposalLatestTimestamp: {
    type: Number,
  },
  snapshotProposalEndedTimestamp: {
    type: Number,
  },
});

export const mStableModel = model<ImStableData>('mStableDb', mStableSchema);
