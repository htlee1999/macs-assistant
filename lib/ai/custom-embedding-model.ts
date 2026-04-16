import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

const MODEL_NAME = 'Xenova/bge-base-en-v1.5';
export const EMBEDDING_DIMENSIONS = 768;

let extractor: FeatureExtractionPipeline | null = null;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', MODEL_NAME, {
      dtype: 'fp32',
    });
  }
  return extractor;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const ext = await getExtractor();
  const output = await ext(text, { pooling: 'cls', normalize: true });
  return Array.from(output.data as Float32Array);
}
