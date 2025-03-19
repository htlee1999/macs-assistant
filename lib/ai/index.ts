// custom-model.ts
import { google } from '@ai-sdk/google';
import { wrapLanguageModel } from 'ai'; // Use non-experimental import
import { customMiddleware } from './custom-middleware';

export const customModel = (apiIdentifier: string) => {
  // Use the non-deprecated wrapLanguageModel function
  return wrapLanguageModel({
    model: google(apiIdentifier), // Type assertion to fix version mismatch
    middleware: customMiddleware,
  });
};