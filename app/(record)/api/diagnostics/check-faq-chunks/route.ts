// app/api/diagnostics/check-faq-chunks/route.ts
import { auth } from '@/app/(auth)/auth';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { faqChunks } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

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

    // Connect to database
    const client = postgres(process.env.POSTGRES_URL!);
    const db = drizzle(client);
    
    // Get basic counts
    const countResult = await db.select({
      count: sql`count(*)`
    }).from(faqChunks);
    
    const totalCount = Number(countResult[0]?.count || 0);
    
    // Check if table is empty
    if (totalCount === 0) {
      return new Response(JSON.stringify({ 
        status: 'empty',
        message: 'FAQ chunks table is empty. No data has been imported.'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get sample data (5 records)
    const sampleData = await db.select().from(faqChunks).limit(5);
    
    // Check for categories
    const categories = await db.select({
      category: faqChunks.category
    })
    .from(faqChunks)
    .groupBy(faqChunks.category);
    
    // Check for embeddings
    const embeddingCheck = await db.select({
      hasEmbedding: sql`COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END)`,
      noEmbedding: sql`COUNT(CASE WHEN embedding IS NULL THEN 1 END)`
    }).from(faqChunks);
    
    // Check for McDonald's related content
    const mcdonaldsCheck = await db.select({
      count: sql`count(*)`
    })
    .from(faqChunks)
    .where(sql`
      LOWER(content) LIKE '%mcdonald%' OR 
      LOWER(heading) LIKE '%mcdonald%' OR
      LOWER(content) LIKE '%burger%' OR
      LOWER(heading) LIKE '%burger%'
    `);
    
    return new Response(JSON.stringify({ 
      status: 'success',
      totalRecords: totalCount,
      sampleData: sampleData.map(item => ({
        id: item.id,
        faq_id: item.faq_id,
        heading: item.heading,
        category: item.category,
        contentPreview: item.content?.substring(0, 100) + '...',
        hasEmbedding: !!item.embedding
      })),
      categoryCount: categories.length,
      categories: categories.map(c => c.category),
      embeddingStats: {
        withEmbeddings: Number(embeddingCheck[0]?.hasEmbedding || 0),
        withoutEmbeddings: Number(embeddingCheck[0]?.noEmbedding || 0)
      },
      mcdonaldsRelatedContent: Number(mcdonaldsCheck[0]?.count || 0)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error checking FAQ chunks:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to check FAQ chunks',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}