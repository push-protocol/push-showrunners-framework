/* eslint-disable prettier/prettier */
import { model, Schema, Document } from 'mongoose';

export interface ItracerDAOData {
  snapshotProposalLatestTimestamp?: number;
  snapshotProposalEndedTimestamp?: number;
}

const tracerDAOSchema = new Schema<ItracerDAOData>({
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

export const tracerDAOModel = model<ItracerDAOData>('tracerDAODb', tracerDAOSchema);