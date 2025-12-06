import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWeatherData extends Document {
  batchId: string;
  latitude: number;
  longitude: number;
  forecastTime: Date;
  temperature: number;
  humidity: number;
  precipitationRate: number;
  createdAt: Date;
  updatedAt: Date;
}

const WeatherDataSchema: Schema = new Schema({
  batchId: {
    type: String,
    required: true,
    index: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  forecastTime: {
    type: Date,
    required: true,
    index: true,
  },
  temperature: {
    type: Number,
    required: true,
  },
  humidity: {
    type: Number,
    required: true,
  },
  precipitationRate: {
    type: Number,
    required: true,
  },
}, {
  timestamps: true,
});

WeatherDataSchema.index({ latitude: 1, longitude: 1, batchId: 1 }, { unique: true });
WeatherDataSchema.index({ batchId: 1, forecastTime: 1 });

export const WeatherData: Model<IWeatherData> = mongoose.model<IWeatherData>('WeatherData', WeatherDataSchema);

