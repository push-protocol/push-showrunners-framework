import { model, Schema, Document } from 'mongoose';
const PollModel = new Schema(
    {
        title: {
            type: String,
            required: true,
        },
        startDate: {
            type: Number,
            required: true,
        },
        endDate: {
            type: Number,
            required: true,
        },
        url:{
            type:String,
            require:true
        }
    },

);

export default model<Document>('Poll', PollModel);