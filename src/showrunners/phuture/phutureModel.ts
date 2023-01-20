import { model, Schema } from 'mongoose';

export interface IPhutureData {
  assets?: object[];
  timestamp?: number;
  basePrice?: number;
}

const phutureSchema = new Schema({
  _id: {
    type: String,
  },
  assets: {
    type: Array,
  },
  timestamp: {
    type: Number,
  },
  basePrice: {
    type: Number,
  },
});

export const phutureModel = model<IPhutureData>('phutureDB', phutureSchema);

// export default model<IPhutureData>('PhutureDataDB', phutureSchema);
