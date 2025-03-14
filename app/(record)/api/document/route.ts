// app/api/document/route.ts
import { auth } from '@/app/(auth)/auth';
import { getRecordById, getSomeRecordsById } from '@/lib/db/queries';
import { JSONContent } from 'novel';

// Define types for our related email objects
interface RelatedEmailDetail {
  id: string;
  message: string;
  draft: JSONContent | null;
  reply: string | null;
  category: string;
  creationDate: Date;
}

export async function GET(request: Request) {
  console.log('Route handler accessed');
  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Extract recordId from the query parameter
    const url = new URL(request.url);
    const recordId = url.searchParams.get('recordId');

    if (!recordId) {
      return new Response('Missing recordId', { status: 400 });
    }

    // Fetch the record using the recordId
    const record = await getRecordById({ id: recordId });
    if (!record) {
      console.error('Email record not found');
      return new Response('Email record not found', { status: 404 });
    }

    // Return relevant chunks if they already exist
    if (record.relatedEmails) {
      // Get the related email IDs from the record
      const relatedEmailIds = Array.isArray(record.relatedEmails) ? record.relatedEmails : [];
      
      // Fetch the complete email records for the related emails
      let relatedEmailDetails: RelatedEmailDetail[] = [];
      
      if (relatedEmailIds.length > 0) {
        // Use getSomeRecordsById to get the full details of related emails
        const relatedEmailRecords = await getSomeRecordsById({ ids: relatedEmailIds });
        
        // Map the records to include only the necessary fields
        relatedEmailDetails = relatedEmailRecords.map(email => ({
          id: email.id,
          message: email.message,
          draft: email.draft,
          reply: email.reply,
          category: email.category,
          creationDate: email.creationDate
        }));
      }
      
      console.log(record.relevantChunks)
      return new Response(
        JSON.stringify({ 
          reasoning: record.reasoning, 
          relevantChunks: record.relevantChunks, 
          relatedEmails: relatedEmailDetails // Now contains full email details
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return an empty response if no relevantChunks are found
    return new Response(
      JSON.stringify({ reasoning: "", relevantChunks: [], relatedEmails: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching relevant chunks:', error);
    return new Response('Error processing request', { status: 500 });
  }
}