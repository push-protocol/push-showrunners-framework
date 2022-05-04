import { model, Schema, Document } from 'mongoose';

export interface IMoverSchema {
  yieldDistributedBlockNo?: number;
  
}
const MoverDB = new Schema<IMoverSchema>({
  _id: {
    type: String,
  },
  yieldDistributedBlockNo: {
    type: Number,
  },
});

export const MoverModel = model<IMoverSchema>('MoverDB', MoverDB);
