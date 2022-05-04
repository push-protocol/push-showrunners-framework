import { model, Schema, Document } from 'mongoose';
import { Proposal } from './epnsGovChannel';


const ProposalSchema = new Schema<Proposal>({
  _id: {
    type: String,
  },
  creationTimestamp: {
    type: Number,
  },
});

export const ProposalModel = model<Proposal>('Proposal', ProposalSchema);
