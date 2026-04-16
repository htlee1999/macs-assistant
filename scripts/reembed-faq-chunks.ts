import { config } from 'dotenv';
import postgres from 'postgres';
import { generateEmbedding } from '../lib/ai/custom-embedding-model';

config({ path: '.env.local' });

async function reembed() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  const client = postgres(process.env.POSTGRES_URL, { max: 1 });

  const rows = await client`SELECT id, heading FROM faq_chunks`;
  console.log(`Found ${rows.length} FAQ chunks to re-embed`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const text = row.heading.replaceAll('\n', ' ');

    try {
      const embedding = await generateEmbedding(text);
      const vectorStr = `[${embedding.join(',')}]`;

      await client`
        UPDATE faq_chunks
        SET embedding = ${vectorStr}::vector
        WHERE id = ${row.id}
      `;

      success++;
      if ((i + 1) % 50 === 0 || i === rows.length - 1) {
        console.log(`Progress: ${i + 1}/${rows.length} (${success} ok, ${failed} failed)`);
      }
    } catch (err) {
      failed++;
      console.error(`Failed to embed chunk ${row.id}:`, err);
    }
  }

  console.log(`Done. ${success} re-embedded, ${failed} failed.`);
  await client.end();
  process.exit(0);
}

reembed().catch((err) => {
  console.error('Re-embedding failed:', err);
  process.exit(1);
});
