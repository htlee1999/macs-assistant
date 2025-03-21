// Create a new file: app/api/test-embedding/route.ts

import { auth } from '@/app/(auth)/auth';
import { testEmbedding } from '@/lib/db/queries';

export async function GET(req: Request) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get faq_id from URL parameters
    const { searchParams } = new URL(req.url);
    const faqId = searchParams.get('faqId');
    
    if (!faqId) {
      return new Response(JSON.stringify({ error: 'faqId parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Run the test
    const result = await testEmbedding(faqId);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error testing embedding:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to test embedding',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}