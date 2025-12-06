import axios, { AxiosInstance } from 'axios';
import { Batch, BatchMetadataResponse } from './types.js';

export class WeatherApiClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private maxRetries: number = 120;
  private retryDelay: number = 1000; // 1 second

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
    });
  }

  private async retry<T>(fn: () => Promise<T>, retries: number = this.maxRetries): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries > 0 && (error.response?.status >= 500 || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT')) {
        // Only log retries on last attempt to reduce noise
        if (retries === 1) {
          console.log(`Retrying... ${retries} attempt left`);
        }
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.retry(fn, retries - 1);
      }
      throw error;
    }
  }

  async getBatches(): Promise<Batch[]> {
    return this.retry(async () => {
      const response = await this.client.get<Batch[]>('/batches');
      return response.data;
    });
  }

  async getBatchData(batchId: string, page: number = 0): Promise<BatchMetadataResponse> {
    return this.retry(async () => {
      const response = await this.client.get<BatchMetadataResponse>(`/batches/${batchId}`, {
        params: { page },
      });
      return response.data;
    });
  }

  async getAllBatchPages(batchId: string, onPage?: (data: BatchMetadataResponse) => Promise<void>): Promise<void> {
    let currentPage = 0;
    let totalPages = 1;

    while (currentPage < totalPages) {
      const pageData = await this.getBatchData(batchId, currentPage);
      totalPages = pageData.metadata.total_pages;

      if (onPage) {
        await onPage(pageData);
      }

      currentPage++;
    }
  }
}

