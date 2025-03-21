// api/summary

import { auth } from '@/app/(auth)/auth';
import { generateText } from 'ai';
import { updateRecordSummary, updateRecordTopics } from '@/lib/db/queries';
import { customModel } from "@/lib/ai";

export async function POST(req: Request) {
    const session = await auth();

    if (!session || !session.user) {
        return Response.json('Unauthorized!', { status: 401 });
    }

    // biome-ignore lint: Forbidden non-null assertion.
    const { records } = await req.json();
    try {
        for (const record of records) {
            if (!record.summary || record.summary.trim() === '') {
                try {
                    const { summary, evergreen_topics } = await createSummaryAndTopics(record.message);

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

                console.log("New summary and topics generated: ", summary, evergreen_topics);
                } catch (error) {
                console.error('Error generating summary and topics:', error);
                }
            }
        }
        return Response.json({ message: "Records processed successfully"})
    } catch (error) {
        console.error('Error processing records ', error)
        return Response.json({ error: "Failed to process records" }, {status: 500})
    }
}


// Function to generate summary using OpenAI
async function createSummaryAndTopics(message: string): Promise<{ summary: string, evergreen_topics: string[] }> {
  
  const evergreenTopics = [
    "Food Information",
    "Delivery Orders",
    "Promotions",
    "Restaurant Information",
    "The McDonald's App",
    "Gift Certificates",
    "Large Orders",
    "McDelivery Service",
    "Drive-Thru",
    "Happy Meal",
    "Celebrating Birthdays"
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
    model: customModel("gemini-2.0-flash"),
  });

  let summary = "";
  let evergreen_topics: string[] = [];

  try {
    const jsonString = result.text.trim();
    const jsonBlocks = jsonString.match(/\{.*?\}/gs); // Extract JSON objects
    
    for (const block of jsonBlocks || []) {
      try {
        const parsedResponse = JSON.parse(block);
        summary = parsedResponse.summary || "";
        evergreen_topics = parsedResponse.evergreen_topics || [];
        break; // Exit loop once a valid JSON block is parsed
      } catch (error) {
        console.error("Failed to parse JSON block:", block);
        console.error("Error:", error);
      }
    }
  } catch (error) {
    console.error("Error parsing response from OpenAI:", error);
  }
  
  return { summary, evergreen_topics };
}
