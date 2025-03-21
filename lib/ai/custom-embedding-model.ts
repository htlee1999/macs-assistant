// lib/ai/generateEmbedding.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';

// Initialize the Google AI client with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY|| '');


/**
 * Generates an embedding for the given text using Google's Generative AI
 * 
 * @param text Text to generate an embedding for
 * @returns An array of numbers representing the embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Get the embedding model
    // const embeddingModel = genAI.getGenerativeModel({
    //   model: "gemini-embedding-exp-03-07"
    // });
    const embeddingModel = openai.embedding('text-embedding-ada-002');
    
    // Add exponential backoff and retry logic
    const maxRetries = 5;
    let retryCount = 0;
    let delay = 1000; // Start with 1 second
    
    while (retryCount < maxRetries) {
      try {
        // Generate the embedding
        const embeddingResult = await embed({ model: embeddingModel, value: text });
        // console.log('Embedding: ', embeddingResult);
        // Return the embedding vector
        return embeddingResult.embedding;
      } catch (error: any) {
        if (error.status === 429 && retryCount < maxRetries - 1) {
          // Wait for backoff period
          await new Promise(resolve => setTimeout(resolve, delay));
          // Increase delay for next retry (exponential backoff)
          delay *= 2;
          retryCount++;
        } else {
          throw error;
        }
      }
    }
    
    throw new Error("Max retries exceeded");
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw error;
  }
}