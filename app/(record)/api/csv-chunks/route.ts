import { auth } from '@/app/(auth)/auth';
import Papa from 'papaparse';
import { 
 storeFAQChunks, 
 testEmbedding
} from '@/lib/db/queries'; 
import { generateEmbedding } from '@/lib/ai/custom-embedding-model';

// FAQ Item interface matching your CSV structure
interface FAQItem {
 id: number;
 category: string;
 section: string;
 heading: string;
 content: string;
}

export async function POST(req: Request) {
 try {
   // Auth check
   const session = await auth();
   if (!session?.user) {
     return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
       status: 401,
       headers: { 'Content-Type': 'application/json' }
     });
   }

   // Check if the request contains CSV data
   const formData = await req.formData();
   const file = formData.get('file') as File | null;
   
   if (!file) {
     return new Response(JSON.stringify({ error: 'No CSV file provided' }), {
       status: 400,
       headers: { 'Content-Type': 'application/json' }
     });
   }

   // Read the file
   const text = await file.text();
   
   // Parse the CSV
   const parseResult = await new Promise<Papa.ParseResult<FAQItem>>((resolve, reject) => {
     Papa.parse<FAQItem>(text, {
       header: true,
       dynamicTyping: true,
       skipEmptyLines: true,
       complete: (results) => resolve(results),
       error: (error: unknown) => reject(error)
     });
   });

   // Generate embeddings for each item (in batches to avoid rate limits)
   const batchSize = 20;
   const formattedItems = [];
   
   for (let i = 0; i < parseResult.data.length; i += batchSize) {
     const batch = parseResult.data.slice(i, i + batchSize);
     const batchPromises = batch.map(async (item) => {
       // Handle null/undefined values with optional chaining or empty string fallbacks
       const itemId = item?.id?.toString() || '';
       const category = item?.category || '';
       const section = item?.section || '';
       const heading = item?.heading || '';
       const content = item?.content || '';
       
       // Skip items with missing required data
       if (!itemId || (!heading && !content)) {
         console.warn(`Skipping item with missing data:`, item);
         return null;
       }
       
       // Combine heading and content for better embedding context
       const textToEmbed = `${heading}`.replaceAll('\n', ' ');
       
       try {
         // Use our reusable generateEmbedding function
         const embedding = await generateEmbedding(textToEmbed);
         
         return {
           faq_id: itemId,
           category,
           section,
           heading,
           content,
           embedding
         };
       } catch (error) {
         console.warn(`Failed to generate embedding for item ${itemId}:`, error);
         // Still include the item even without embedding
         return {
           faq_id: itemId,
           category,
           section,
           heading,
           content
         };
       }
     });
     
     // Wait for all embeddings in this batch and filter out null entries
     const batchResults = (await Promise.all(batchPromises)).filter(Boolean);
     formattedItems.push(...batchResults);
     
     // Log progress
     console.log(`Processed batch ${i / batchSize + 1} of ${Math.ceil(parseResult.data.length / batchSize)}`);
   }

   // Store chunks using the function from queries.ts
   const validItems = formattedItems.filter(item => item !== null) as Array<{
     faq_id: string;
     category: string;
     section: string;
     heading: string;
     content: string;
     embedding: number[];
   }>;
   const insertedCount = await storeFAQChunks(validItems);

   // Test a random item to verify embeddings are working
   let embeddingTestResult = null;
   if (insertedCount > 0 && formattedItems.length > 0) {
     try {
       // Select a random item that has an embedding
       const itemsWithEmbeddings = formattedItems.filter(item => item && item.embedding);
       
       if (itemsWithEmbeddings.length > 0) {
         const randomIndex = Math.floor(Math.random() * itemsWithEmbeddings.length);
         const sampleItem = itemsWithEmbeddings[randomIndex];
         
         // Test the embedding
         if (sampleItem) {
           embeddingTestResult = await testEmbedding(sampleItem.faq_id);
         }
         
         console.log('Embedding test result:', embeddingTestResult);
       }
     } catch (testError) {
       console.warn('Embedding test failed, but upload was successful:', testError);
       // Don't fail the whole request if just the test fails
     }
   }

   // Return success with test results if available
   return new Response(JSON.stringify({ 
     success: true,
     message: `Successfully processed ${insertedCount} FAQ items with embeddings`,
     totalRows: parseResult.data.length,
     processedRows: formattedItems.length,
     // Include embedding test results if available
     embeddingTest: embeddingTestResult,
     embeddingStats: {
       itemsWithEmbeddings: formattedItems.filter(item => item && item.embedding).length,
       itemsWithoutEmbeddings: formattedItems.filter(item => item && !item.embedding).length
     }
   }), {
     status: 200,
     headers: { 'Content-Type': 'application/json' }
   });

 } catch (error) {
   console.error('Error processing CSV:', error);
   return new Response(JSON.stringify({ 
     error: 'Failed to process CSV file',
     details: error instanceof Error ? error.message : String(error)
   }), {
     status: 500,
     headers: { 'Content-Type': 'application/json' }
   });
 }
}