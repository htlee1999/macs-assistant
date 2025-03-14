// app/api/editor/route.ts
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/app/(auth)/auth';
import { getRecordById, getRecordsByUserId, updateDraftById, deleteDraftById, insertDocument, saveDraftAndReasoning } from '@/lib/db/queries';
import { generateEditorContent } from '@/lib/editor/content';
import { openai } from '@ai-sdk/openai';
import { embed, generateText } from 'ai';
import type { JSONContent } from 'novel';
import { ApplicationError } from '@/lib/errors';

const chatModel = openai.chat("gpt-4-turbo-preview");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const embeddingModel = openai.embedding('text-embedding-ada-002');

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

    // Get recordId from URL params
    const url = new URL(req.url);
    const recordId = url.searchParams.get('recordId');

    if (!recordId) {
      return new Response(JSON.stringify({ error: 'Record ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch record
    const record = await getRecordById({ id: recordId });
    
    if (!record) {
      return new Response(JSON.stringify({ error: 'Record not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }


    return new Response(JSON.stringify(record), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in GET handler:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new ApplicationError('Missing Supabase environment variables');
  }

  // Parse request body
  const body = await req.json();
  const { recordId, generateDraft, draft } = body;

  if (!recordId) {
    console.error('Missing recordId');
    return new Response(JSON.stringify({ error: 'Missing recordId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const record = await getRecordById({ id: recordId });

  if (!record) {
    console.error('Record not found for ID:', recordId);
    return new Response(JSON.stringify({ error: 'Record not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    let response: any = {
      emailData: null,
      editorState: null,
      generatedDraft: null,
      hasDraft: false
    };

    // Handle manual draft update
    if (draft) {
      try {
        // Check if draft has actual content
        const hasContent = draft.content?.some((node: any) =>
          node.content?.some((content: any) => content.text?.trim().length > 0)
        );

        if (hasContent) {
          await updateDraftById({
            recordId,
            draft: draft as JSONContent,
          });
          response.editorState = draft;
          response.hasDraft = true;
        } else {
          // If draft is empty, delete it
          await deleteDraftById({ recordId });
          response.hasDraft = false;
        }
      } catch (error) {
        console.error('Error updating draft:', error);
        return new Response(JSON.stringify({ error: 'Failed to update draft' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Generate and save AI draft if requested
    if (generateDraft) {
      let relevantChunks = Array.isArray(record.relevantChunks) ? record.relevantChunks : [];
      let relatedReplies: { message: string, reply: string }[] = [];

      // If no relevantChunks, generate them
      if (relevantChunks.length === 0) {
        const searchText = `${record.message}`.replaceAll('\n', ' ');
        const { embedding } = await embed({ model: embeddingModel, value: searchText });

        try {
          const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
          const { data: fetchedChunks, error: matchError } = await supabaseClient.rpc('match_page_sections', {
            embedding,
            match_threshold: 0.80,  
            match_count: 3,
            min_content_length: 50
          });

          if (matchError || !fetchedChunks) {
            console.error('Error matching page sections:', matchError);
            return new Response('Error finding relevant information', { status: 500 });
          }

          relevantChunks = fetchedChunks.map((chunk: any) => ({
            content: chunk.content.trim(),
            heading: chunk.heading || 'General Information',
            similarity: Math.round(chunk.similarity * 100) / 100
          }));
          console.log('Relevant chunks:', relevantChunks);
        } catch (error) {
          console.error('Error fetching chunks from Supabase:', error);
          return new Response(JSON.stringify({ error: 'Failed to fetch relevant chunks from Supabase' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      try {
        // SIMILAR EMAILS
        const emailRecords = await getRecordsByUserId({ id: session.user.id });

        const emailMatches = emailRecords
          .filter(emailRecord => emailRecord.id !== recordId)
          .map(emailRecord => {
            const similarity = calculateSimilarity(emailRecord.message.toLowerCase(), record.message.toLowerCase());
            return { emailRecord, similarity };
          });

        const validMatches = emailMatches.filter(match => match.similarity < 1.0);

        const topMatches = validMatches
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 5);

        // Collect replied emails to use as examples
        relatedReplies = topMatches
          .filter(match => match.emailRecord.reply !== null) // Only include records with non-null replies
          .map(match => ({
            message: match.emailRecord.message,
            reply: match.emailRecord.reply as string, // Type assertion to ensure reply is string
            similarity: match.similarity
          }));

        const relatedEmailIds = topMatches.map(match => match.emailRecord.id);

        // Save the related email IDs
        await insertDocument({ recordId, relevantChunks, topMatches: relatedEmailIds });
      } catch (error) {
        console.error('Error handling similar emails:', error);
        return new Response(JSON.stringify({ error: 'Failed to process similar emails' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const formattedChunks = relevantChunks.map(chunk => {
        return `
          <p>${chunk.heading}</p>
          <p>${chunk.content}</p>
        `;
      }).join('<p></p>');

      // Format related replies for inclusion in the prompt
      let formattedRelatedReplies = '';
      if (relatedReplies.length > 0) {
        formattedRelatedReplies = `\n\nHere are some related emails and how they were replied to (ordered by relevance):\n\n` +
          relatedReplies.map((item, index) => 
            `EXAMPLE ${index + 1}:\nOriginal email: ${item.message}\nReply: ${item.reply}\n`
          ).join('\n');
      }
      // console.log('formattedRelatedReplies are here:', formattedRelatedReplies);

      try {
        const rules = `You are representing as a URA official helping to draft email responses. You do not have to explicitly state your role. Abide by the following rules when writing.\n\n
        Use simple language.\n
        Avoid AI-giveaway phrases.\n
        Be direct and concise.\n
        Maintain a natural but also professional tone.\n
        Avoid marketing language.\n
        Keep it real.\n
        Simplify grammar.\n
        Stay away from fluff.\n
        Focus on clarity.\n\n`;

        const result = await generateText({
          model: chatModel,
          prompt: rules + `Please draft a response to this email:\n
              Content: ${record.message}\n
              
              Below is some potentially related information to the email. Please use the information appropriately. \n\n

              ${formattedChunks}\n\n
              ${formattedRelatedReplies}\n\n
              
              When drafting your response, consider the patterns and tone in the example replies if they're provided, 
              but make sure to adapt your response specifically to this new email.
              
              Please provide the reasoning to how the given information is related to the email. You are to strictly write in the following format.\n\n
            
              Reasoning:\n\n
            
              Draft:`,
          maxTokens: 4096,
          temperature: 0.7,
          maxSteps: 1,
        });

        const cleanDraft = result.text
          .replace(/^0:"|"$/g, '')
          .replace(/\n0:"/g, '\n')
          .replace(/\\n/g, '\n')
          .replace(/"/g, '')
          .trim();

        // Regular expression to capture Reasoning and Draft sections
        const reasoningRegex = /Reasoning:\s*(.*?)\s*Draft:/s;
        const draftRegex = /Draft:\s*(.*)/s;

        // Extracting the reasoning and draft
        const reasoningMatch = cleanDraft.match(reasoningRegex);
        const draftMatch = cleanDraft.match(draftRegex);

        let reasoning = '';
        let draft = '';

        // If Reasoning section exists, assign to reasoning
        if (reasoningMatch) {
          reasoning = reasoningMatch[1].trim();
        }

        // If Draft section exists, assign to cleanDraft (or draft variable)
        if (draftMatch) {
          draft = draftMatch[1].trim();
        }

        response.reasoning = reasoning;
        response.generatedDraft = draft;

        const editorState = generateEditorContent({
          ...response.emailData,
          draft: draft
        });

        await saveDraftAndReasoning({
          recordId,
          draft: editorState,
          reasoning: reasoning
        });

        response.editorState = editorState;
        response.hasDraft = true;
      } catch (error) {
        console.error('Error generating/saving draft:', error);
        return new Response(JSON.stringify({ error: 'Failed to generate/save draft' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in POST handler:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);
    const recordId = url.searchParams.get('recordId');

    if (!recordId) {
      return new Response('Record ID is required', { status: 400 });
    }

    const existingRecord = await getRecordById({ id: recordId });
    
    if (!existingRecord) {
      return new Response('Record not found', { status: 404 });
    }

    if (existingRecord.actionOfficer1 !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const result = await deleteDraftById({ recordId });

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error in DELETE draft handler:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Failed to delete draft' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Similarity calculation function
function calculateSimilarity(text1: string, text2: string): number {
  // Convert text to lowercase and split into words
  const words1 = new Set(text1.split(/\W+/).filter(Boolean)); // Avoid empty strings
  const words2 = new Set(text2.split(/\W+/).filter(Boolean));

  // Calculate intersection and union of words
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);

  // Return Jaccard similarity coefficient (intersection size / union size)
  return intersection.size / union.size;
}