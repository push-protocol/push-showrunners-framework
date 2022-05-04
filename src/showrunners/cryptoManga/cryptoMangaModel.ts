/* eslint-disable prettier/prettier */
import { model, Schema, Document } from 'mongoose';

export interface IcryptoMangaData {
  snapshotProposalLatestTimestamp?: number;
  snapshotProposalEndedTimestamp?: number;
}

const cryptoMangaSchema = new Schema<IcryptoMangaData>({
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

export const cryptoMangaModel = model<IcryptoMangaData>('cryptoMangaDb', cryptoMangaSchema);
