import { auth } from '@/app/(auth)/auth';
import { getRecordById, updateOutcomeById, deleteDraftById, getOutcomeById } from '@/lib/db/queries';
import { NextRequest } from 'next/server';

export async function POST(req: Request) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body = await req.json();
    let { recordId, outcome } = body;

    // Validate input
    if (!recordId) {
      return new Response(JSON.stringify({ error: 'Record ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate outcome is provided
    if (!outcome) {
      return new Response(JSON.stringify({ error: 'Outcome is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch the existing record
    const record = await getRecordById({ id: recordId });
    
    if (!record) {
      return new Response(JSON.stringify({ error: 'Record not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Force "Replied" status if the record has a reply
    if (record.reply && outcome !== 'Replied') {
      console.log(`Record ${recordId} has a reply but outcome is ${outcome}. Forcing "Replied" status.`);
      outcome = 'Replied';
    }

    try {
      // Update the record's outcome
      const updateResult = await updateOutcomeById({ 
        recordId, 
        outcome 
      });
      
      // Return success response
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Outcome updated successfully',
        recordId,
        outcome,
        updatedRecord: updateResult.updatedRecord
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (updateError) {
      console.error('Error updating outcome:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Failed to update outcome', 
        details: updateError instanceof Error ? updateError.message : String(updateError)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Unexpected error in outcome update:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}




export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract recordId from URL query parameters
    const url = new URL(request.url);
    const recordId = url.searchParams.get('recordId');

    // Validate the input
    if (!recordId) {
      return new Response(JSON.stringify({ error: 'Record ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the outcome for the specified record
    const outcome = await getOutcomeById({ id: recordId });

    // Check if record exists
    if (outcome === null) {
      return new Response(JSON.stringify({ error: 'Record not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the full record to check if it has a reply
    const record = await getRecordById({ id: recordId });

    // Force "Replied" status if the record has a reply
    let finalOutcome = outcome;
    if (record && record.reply && outcome !== 'Replied') {
      console.log(`Record ${recordId} has a reply but outcome is ${outcome}. Returning "Replied" status.`);
      finalOutcome = 'Replied';
      
      // Optionally update the database to fix the inconsistency
      await updateOutcomeById({ recordId, outcome: 'Replied' });
    }

    // Return success response with just the outcome
    return new Response(JSON.stringify({
      success: true,
      recordId,
      outcome: finalOutcome,
      reply : record?.reply
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching record outcome:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
