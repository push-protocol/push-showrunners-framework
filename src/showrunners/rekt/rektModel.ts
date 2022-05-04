/* eslint-disable prettier/prettier */
import { model, Schema, Document } from 'mongoose';
import { RektArticle } from './rektChannel';


const RektDB = new Schema<RektArticle>({
  _id: {
    type: String,
  },
  pubDate: {
    type: Number,
  },
});

export const RektModel = model<RektArticle>('RektDB', RektDB);