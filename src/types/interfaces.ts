export interface WeatherDataPoint {
  forecastTime: string;
  Temperature: number;
  Precipitation_rate: number;
  Humidity: number;
}

export interface WeatherSummary {
  max: {
    Temperature: number;
    Precipitation_rate: number;
    Humidity: number;
  };
  min: {
    Temperature: number;
    Precipitation_rate: number;
    Humidity: number;
  };
  avg: {
    Temperature: number;
    Precipitation_rate: number;
    Humidity: number;
  };
}

export interface BatchMetadataResponse {
  batchId: string;
  forecastTime: string;
  numberOfRows: number;
  startIngestTime: string;
  endIngestTime?: string;
  status: 'RUNNING' | 'ACTIVE' | 'INACTIVE';
}

export interface WeatherQueryParams {
  lat: string;
  lon: string;
}

