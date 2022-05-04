import { model, Document, Schema } from 'mongoose';

export interface GroData {
  latestClaimBlock?: number;
  latestOtherBlock?: number;
}

export interface GroWalletAirdropData {
  walletAddress?: string;
  airdropLength?: number;
}

const groSchema = new Schema<GroData>({
  _id: {
    type: String,
  },
  latestClaimBlock: {
    type: Number,
  },
  latestOtherBlock: {
    type: Number,
  },
});

const groWalletAirdropSchema = new Schema<GroWalletAirdropData>({
  walletAddress: {
    type: String,
  },
  airdropLength: {
    type: String,
  },
});

export const groModel = model<GroData>('groDB', groSchema);
export const groWalletAirdropModel = model<GroWalletAirdropData>('groWalletDB', groWalletAirdropSchema);
