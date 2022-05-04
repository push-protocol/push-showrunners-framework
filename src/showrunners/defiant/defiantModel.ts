/* eslint-disable prettier/prettier */
import { model, Schema } from 'mongoose';
import { DefiantArticle } from './defiantChannel';

const DefiantDB = new Schema<DefiantArticle>({
  _id: {
    type: String,
  },
  pubDate: {
    type: Number,
  },
});

export const DefiantModel = model<DefiantArticle>('DefiantDB', DefiantDB);
