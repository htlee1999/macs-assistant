// app/api/diagnostics/check-vector/route.ts
import { auth } from '@/app/(auth)/auth';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';

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
    
    // Check for pgvector extension
    const vectorExtensionResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM pg_extension
      WHERE extname = 'vector'
    `);
    
    const hasVectorExtension = Number((vectorExtensionResult as any[])[0]?.count || 0) > 0;
    
    // Check for vector column in faq_chunks table
    const vectorColumnResult = await db.execute(sql`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'faq_chunks' AND column_name = 'embedding'
    `);
    
    const columnInfo = (vectorColumnResult as any[])[0] || null;
    
    // Test a simple vector operation if the extension exists
    let vectorOperationTest: { success: boolean; error: string | null } = { success: false, error: null };
    if (hasVectorExtension) {
      try {
        // Try a simple vector operation
        await db.execute(sql`
          SELECT '[1,2,3]'::vector <=> '[4,5,6]'::vector as distance
        `);
        vectorOperationTest.success = true;
      } catch (error) {
        vectorOperationTest.success = false;
        vectorOperationTest.error = error instanceof Error ? error.message : String(error);
      }
    }
    
    // Get PostgreSQL version info
    const versionResult = await db.execute(sql`SELECT version()`);
    const pgVersion = (versionResult as any[])[0]?.version || 'unknown';
    
    return new Response(JSON.stringify({ 
      pgVersion,
      vectorExtension: {
        installed: hasVectorExtension,
        operationTest: vectorOperationTest
      },
      embeddingColumn: {
        exists: !!columnInfo,
        details: columnInfo
      },
      recommendation: !hasVectorExtension ? 
        "The pgvector extension is not installed. Run 'CREATE EXTENSION vector;' in your PostgreSQL database." :
        !vectorOperationTest.success ?
        "The pgvector extension is installed but vector operations are failing. Check PostgreSQL configuration." :
        "Vector functionality appears to be working correctly."
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error checking vector extension:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to check vector extension',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}