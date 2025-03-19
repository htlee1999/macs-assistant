import { auth } from '@/app/(auth)/auth';
import Papa from 'papaparse';
import { 
  storeFAQChunks, 
  searchFAQChunks,
  vectorSearchFAQChunks
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
        // Combine heading and content for better embedding context
        const textToEmbed = `${item.heading}: ${item.content}`.replaceAll('\n', ' ');
        
        try {
          // Use our reusable generateEmbedding function
          const embedding = await generateEmbedding(textToEmbed);
          
          return {
            faq_id: item.id.toString(),
            category: item.category || '',
            section: item.section || '',
            heading: item.heading || '',
            content: item.content || '',
            embedding: embedding
          };
        } catch (error) {
          console.warn(`Failed to generate embedding for item ${item.id}:`, error);
          // Still include the item even without embedding
          return {
            faq_id: item.id.toString(),
            category: item.category || '',
            section: item.section || '',
            heading: item.heading || '',
            content: item.content || ''
          };
        }
      });
      
      // Wait for all embeddings in this batch
      const batchResults = await Promise.all(batchPromises);
      formattedItems.push(...batchResults);
      
      // Log progress
      console.log(`Processed batch ${i / batchSize + 1} of ${Math.ceil(parseResult.data.length / batchSize)}`);
    }

    // Store chunks using the function from queries.ts
    const insertedCount = await storeFAQChunks(formattedItems);

    // Return success
    return new Response(JSON.stringify({ 
      success: true,
      message: `Successfully processed ${insertedCount} FAQ items with embeddings`,
      totalRows: parseResult.data.length
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