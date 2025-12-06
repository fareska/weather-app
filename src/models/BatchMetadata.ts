import mongoose, { Schema, Document, Model } from 'mongoose';

export enum BatchStatus {
  RUNNING = 'RUNNING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface IBatchMetadata extends Document {
  batchId: string;
  forecastTime: Date;
  numberOfRows: number;
  startIngestTime: Date;
  endIngestTime?: Date;
  status: BatchStatus;
  rawData?: any;
  createdAt: Date;
  updatedAt: Date;
}

const BatchMetadataSchema: Schema = new Schema({
  batchId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  forecastTime: {
    type: Date,
    required: true,
  },
  numberOfRows: {
    type: Number,
    required: true
  },
  startIngestTime: {
    type: Date,
    required: true
  },
  endIngestTime: {
    type: Date,
  },
  status: {
    type: String,
    enum: Object.values(BatchStatus),
    required: true,
  },
  rawData: {
    type: Schema.Types.Mixed,
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
});

export const BatchMetadata: Model<IBatchMetadata> = mongoose.model<IBatchMetadata>('BatchMetadata', BatchMetadataSchema);

