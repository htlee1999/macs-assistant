// app/api/diagnostics/test-embeddings/route.ts
import { auth } from '@/app/(auth)/auth';
import { generateEmbedding } from '@/lib/ai/custom-embedding-model';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { faqChunks } from '@/lib/db/schema';

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

    // Get the test text from request body
    const { text } = await req.json();
    
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'Invalid request. Please provide a text string.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 1. Test embedding generation
    const startTime = performance.now();
    let embedding;
    try {
      embedding = await generateEmbedding(text);
      
      // Basic validation of embedding
      if (!Array.isArray(embedding)) {
        throw new Error('Generated embedding is not an array');
      }
      
      if (embedding.length === 0) {
        throw new Error('Generated embedding is empty');
      }
      
      // Check if all values are numbers
      const allNumbers = embedding.every(val => typeof val === 'number');
      if (!allNumbers) {
        throw new Error('Embedding contains non-numeric values');
      }
    } catch (error) {
      return new Response(JSON.stringify({ 
        status: 'error',
        phase: 'embedding_generation',
        error: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const generationTime = performance.now() - startTime;
    
    // 2. Test database storage
    const client = postgres(process.env.POSTGRES_URL!);
    const db = drizzle(client);
    
    // Check for pgvector extension
    const vectorExtensionResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM pg_extension WHERE extname = 'vector'
    `);
    
    const hasVectorExtension = Number((vectorExtensionResult as any[])[0]?.count || 0) > 0;
    
    if (!hasVectorExtension) {
      return new Response(JSON.stringify({ 
        status: 'error',
        phase: 'database_check',
        error: 'pgvector extension is not installed in the database',
        embeddingGeneration: {
          success: true,
          time: `${generationTime.toFixed(2)}ms`,
          embeddingSize: embedding.length,
          embeddingSample: embedding.slice(0, 5)
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Test storing in database
    const testId = randomUUID();
    try {
      // Try to store with normal insert first
      await db.insert(faqChunks).values({
        id: testId,
        faq_id: 'test-embedding',
        category: 'TEST',
        section: 'Diagnostics',
        heading: 'Embedding Test',
        content: text,
        embedding: embedding,
        created_at: new Date()
      });
    } catch (insertError) {
      // If that fails, try with SQL and explicit casting
      try {
        await db.execute(sql`
          INSERT INTO faq_chunks (
            id, faq_id, category, section, heading, content, embedding, created_at
          ) VALUES (
            ${testId}, 'test-embedding', 'TEST', 'Diagnostics', 
            'Embedding Test', ${text}, ${embedding}::vector, ${new Date()}
          )
        `);
      } catch (sqlError) {
        return new Response(JSON.stringify({ 
          status: 'error',
          phase: 'database_storage',
          insertError: insertError instanceof Error ? insertError.message : String(insertError),
          sqlError: sqlError instanceof Error ? sqlError.message : String(sqlError),
          embeddingGeneration: {
            success: true,
            time: `${generationTime.toFixed(2)}ms`,
            embeddingSize: embedding.length,
            embeddingSample: embedding.slice(0, 5)
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Verify the stored embedding
    const storedResult = await db.execute(sql`
      SELECT * FROM faq_chunks WHERE id = ${testId}
    `);
    
    const storedItem = (storedResult as any[])[0] || null;
    
    // Clean up test data
    await db.execute(sql`
      DELETE FROM faq_chunks WHERE id = ${testId}
    `);
    
    return new Response(JSON.stringify({ 
      status: 'success',
      embeddingGeneration: {
        success: true,
        time: `${generationTime.toFixed(2)}ms`,
        embeddingSize: embedding.length,
        embeddingSample: embedding.slice(0, 5)
      },
      databaseStorage: {
        success: !!storedItem,
        storedEmbeddingExists: !!storedItem?.embedding,
        storedEmbeddingType: storedItem?.embedding ? typeof storedItem.embedding : null
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error testing embeddings:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to test embeddings',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}