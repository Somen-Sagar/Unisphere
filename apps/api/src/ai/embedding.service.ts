import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Environment } from '../config/environment';

type EmbeddingPipeline = {
  (text: string, options?: { pooling: string; normalize: boolean }): Promise<{
    tolist: () => number[][];
  }>;
};

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private pipeline: EmbeddingPipeline | null = null;
  private loading: Promise<EmbeddingPipeline> | null = null;

  constructor(private readonly config: ConfigService<Environment>) {}

  /**
   * Generate a 384-dimensional embedding vector for the given text.
   * Uses all-MiniLM-L6-v2 loaded via @xenova/transformers (runs in Node.js).
   */
  async embed(text: string): Promise<number[]> {
    const extractor = await this.getExtractor();
    const output = await extractor(text, {
      pooling: 'mean',
      normalize: true,
    });
    return output.tolist()[0];
  }

  /**
   * Generate embeddings for multiple texts in a batch.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  private async getExtractor(): Promise<EmbeddingPipeline> {
    if (this.pipeline) return this.pipeline;

    if (!this.loading) {
      this.loading = this.loadModel();
    }

    this.pipeline = await this.loading;
    return this.pipeline;
  }

  private async loadModel(): Promise<EmbeddingPipeline> {
    this.logger.log(
      'Loading embedding model (all-MiniLM-L6-v2)... This may take a moment on first run.',
    );

    // Dynamic import to avoid issues with ESM/CJS interop
    const { pipeline } = await import('@xenova/transformers');
    const extractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
    );

    this.logger.log('Embedding model loaded successfully.');
    return extractor as unknown as EmbeddingPipeline;
  }
}
