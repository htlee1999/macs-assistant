// lib/ai/generateEmbedding.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    const embeddingModel = genAI.getGenerativeModel({
      model: "embedding-001" // Use the appropriate embedding model name
    });
    
    // Generate the embedding
    const embeddingResult = await embeddingModel.embedContent(text);
    
    // Return the embedding vector
    return embeddingResult.embedding.values;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw error;
  }
}