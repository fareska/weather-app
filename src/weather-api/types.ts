export interface Batch {
  batch_id: string;
  forecast_time: string;
}

export interface BatchMetadata {
  batch_id: string;
  count: number;
  total_pages: number;
  page: number;
  total_items: number;
}

export interface BatchMetadataResponse {
  metadata: BatchMetadata;
  data: WeatherDataPoint[];
}

export interface WeatherDataPoint {
  latitude: number;
  longitude: number;
  temperature: number;
  humidity: number;
  precipitation_rate: number;
}

