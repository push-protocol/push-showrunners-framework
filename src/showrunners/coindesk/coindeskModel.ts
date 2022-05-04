import { model, Schema, Document } from 'mongoose';
import { Article } from './coindeskChannel';


const ArticleSchema = new Schema<Article>({
  _id: {
    type: String,
  },
  pubDate: {
    type: Number,
  },
});

export const ArticleModel = model<Article>('Article', ArticleSchema);
