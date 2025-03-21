import { auth } from '@/app/(auth)/auth';
import { generateText } from 'ai';
import { getRecordsByUserId, updateRecordSummary, updateRecordTopics, saveRecordsByUserId } from '@/lib/db/queries';
import { customModel } from "@/lib/ai";

export async function GET(req: Request) {
  const session = await auth();
  const url = new URL(req.url);
  const generateSummary = url.searchParams.get('generateSummary') === 'true';

  if (!session || !session.user) {
    return Response.json('Unauthorized!', { status: 401 });
  }

  // biome-ignore lint: Forbidden non-null assertion.
  const records = await getRecordsByUserId({ id: session.user.id! });

  // Check and generate summary for records with empty summary
  if(generateSummary){
    console.log("Summaries generating...")
    for (const record of records) {
      if (!record.summary || record.summary.trim() === '') {
        try {
          const { summary, evergreen_topics } = await createSummaryAndTopics(record.message);
          record.summary = summary;

          // Update the summary separately
          await updateRecordSummary({ 
            recordId: record.id, 
            summary
          });

          // Update the topics separately
          await updateRecordTopics({
            recordId: record.id,
            evergreen_topics
          });

          console.log("New summary and topics generated");
        } catch (error) {
          console.error('Error generating summary and topics:', error);
        }
      }
    }
  }

  return Response.json(records);
}

export async function POST(req: Request) {
  const session = await auth();
  const url = new URL(req.url);

  if (!session || !session.user) {
    return Response.json('Unauthorized!', { status: 401 });
  }
  await saveRecordsByUserId({ id: session.user.id!, samples: 13 });

  return Response.json('Records saved!');

}

// Function to generate summary using OpenAI
async function createSummaryAndTopics(message: string): Promise<{ summary: string, evergreen_topics: string[] }> {
  
  const evergreenTopics = [
    "Amenities and Facilities",
    "Sustainability and Resiliency",
    "Public Space",
    "Rejuvenation",
    "Economy",
    "Recreation",
    "Loss of Greenery and Open Space",
    "General DMP19 Enquiries",
    "Parks, Greenery, Biodiversity",
    "Housing",
    "Transport and Mobility",
    "Employment Centers and Offices",
    "Identity/Heritage/Conservation",
    "Health and Medical Care",
    "Sports Facilities",
    "Intensity and Development",
    "Building Height Controls",
    "Information on URA Online",
    "Future Developments",
    "Referred to Other Agencies"
  ];

  const prompt = `
    You are a helpful assistant specialized in summarizing and categorizing textual content.
    You will be given textual content of a feedback email.

    Your first task is to summarize the content concisely, retrieving as many insights as possible.
    Limit your summary to 20 words.
    Start directly with the main point, without introductory phrases such as "The user is" or "This email is".
    Preserve the key details and intent of the email.

    Your second task is to categorize this feedback email into the relevant evergreen topics from a given list.
    Identify and include all relevant topics.

    The list of evergreen topics is as follows:
    ${evergreenTopics.map(topic => `- ${topic}`).join("\n")}

    Your response must be formatted as a JSON object with the following structure:
   json
    {
      "summary": "<concise summary of the feedback email>",
      "evergreen_topics": ["<relevant topic 1>", "<relevant topic 2>", ...]
    }
   

    If the given text lacks sufficient information to summarize, do not generate any response.

    The message is as follows:
    """${message}"""
  `;

  const result = await generateText({
    prompt,
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    model: customModel("gemini-2.0-flash") ,
  });

  try {
    const parsedResult = JSON.parse(result.text.trim());
    return {
      summary: parsedResult.summary || "",
      evergreen_topics: parsedResult.evergreen_topics || [],
    };
  } catch (error) {
    console.error("Error parsing response from OpenAI:", error);
    return { summary: "", evergreen_topics: [] };
  }
}
