import { google } from '@ai-sdk/google';

export const customModel = (apiIdentifier: string) => {
  return google(apiIdentifier);
};
