import { model, Schema, Document } from 'mongoose';

export interface IdydxData {
  proposalCreatedBlockNo?: number;
  proposalExecutedBlockNo?: number;
  proposalQueuedBlockNo?: number;
  snapshotProposalLatestTimestamp?: number;
}

const DYDXSchema = new Schema<IdydxData>({
  _id: {
    type: String,
  },
  proposalCreatedBlockNo: {
    type: Number,
  },
  proposalExecutedBlockNo: {
    type: Number,
  },
  proposalQueuedBlockNo: {
    type: Number,
  },
  snapshotProposalLatestTimestamp: {
    type: Number,
  },
});

export const DYDXModel = model<IdydxData>('DYDXDb', DYDXSchema);
