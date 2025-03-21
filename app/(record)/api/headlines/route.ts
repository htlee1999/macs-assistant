// api/headlines

import { getHeadlines, saveHeadlines, deleteHeadlines, getAllRecords } from '@/lib/db/queries'; 
import { customModel } from "@/lib/ai";
import { generateText } from 'ai';

export async function GET(req: Request) {
  try {
    // Call the getHeadlines function to retrieve the headlines
    const currentHeadlines = await getHeadlines();

    // Return the headlines as JSON response
    return Response.json(currentHeadlines);
  } catch (error) {
    console.error("Error fetching headlines:", error);
    return new Response("Error fetching headlines", { status: 500 });
  }
}

export async function DELETE(req: Request) {
    try {
        await deleteHeadlines();
    } catch (error) {
      console.error("Error fetching headlines:", error);
      return new Response("Error fetching headlines", { status: 500 });
    }
  }

export async function POST(req: Request) {
    const records = await getAllRecords();
    try {
        async function fetchHeadlines(fromDate?: Date): Promise<any[]> {
            try {
                let filteredRecords: any[] = [];
                
                if(fromDate) {
                    // Filter records based on the provided date
                    filteredRecords = records.filter(record => {
                        const recordDate = new Date(record.creationDate)
                        return recordDate >= fromDate;
                    });
                } else {
                    filteredRecords = records
                }

                // Extract summaries from the filtered records
                const feedbackSummaries = filteredRecords
                    .map(record => record.summary)
                    .filter(summary => summary && summary.trim() !== "");

                if (feedbackSummaries.length === 0) {
                    console.log("No feedback summaries found.");
                    return [];
                }

                const headlinesPrompt = `
                    You are an AI assistant specialized in natural language processing, particularly in topic modeling and text analysis.
                    You will be given a list of summaries of feedback from the public to analyze, and your task is to identify and rank the top 10 most frequently discussed specific issues and events, as headlines.
                    These should primarily be concrete projects, locations, policies, or events that have been directly mentioned, rather than broad topics (such as infrastructure, housing, or development).

                    Extract major topics using Latent Dirichlet Allocation (LDA), Non-Negative Matrix Factorization (NMF), or a transformer-based clustering approach (e.g., BERTopic).
                    Ensure that both broad **themes** (e.g., Infrastructure, Transportation, Housing) and **specific issues/events** (e.g., "MRT station construction," "Turf City gazetting") are detected.
                    Use key terms and representative phrases to assist in topic identification.

                    Recognize and extract specific **locations**, **projects**, **policies**, **government decisions**, and **events** that appear in the feedback.
                    If a specific issue is frequently mentioned (e.g., "MRT station construction," "Turf City"), ensure it is highlighted separately, rather than being absorbed into a broader category.

                    First, extract broad themes (e.g., Infrastructure, Housing, Environmental Concerns).
                    Then, identify **specific issues/events** within those themes (e.g., "New MRT station at Jurong," "Demolition of Turf City for new housing").
                    Provide detailed insights by connecting specific mentions to the larger themes they belong to.

                    Return the response as a JSON array of objects with this structure:
                    [
                        {
                        "title": "headline 1",
                        "match_percent": Feedback Volume (percentage of total summaries),
                        "desc": "Detailed explanation of the headline",
                        "entities": ["List of key mentions and named entities"],
                        "examples": ["Example feedback snippets"],
                        "category": "Broad theme",
                        },
                        ...
                    ]

                    Return only JSON. Do not include any other text.
                    `;

                // Make the OpenAI API call
                const response = await generateText({
                    model: customModel("gemini-2.0-flash"),
                    prompt: headlinesPrompt + `This is the list of feedback summaries:\n${JSON.stringify(feedbackSummaries)}`,
                    maxTokens: 4096,
                    temperature: 0.7,
                    maxSteps: 1,
                });

                // Parse the OpenAI JSON response
                const rawText = response.text.trim();
                const cleanedText = rawText.replace(/^```json\n/, "").replace(/\n```$/, "");
                const parsedData = JSON.parse(cleanedText);

                // Map the JSON data to the correct format
                return parsedData.map((headline: any) => ({
                    title: headline.title,
                    match_percent: headline.match_percent.toString(), // Ensure it's a string
                    desc: headline.desc,
                    entities: headline.entities.join(", "), // Convert array to string
                    examples: headline.examples.join(" | "), // Format examples as a single string
                    category: headline.category,
                    date_processed: new Date(), // Add timestamp
                    type: fromDate ? 'today' : 'overall', // 'today' for specific date, 'overall' for all records
                    topic: headline.topic || null, // Include topic if available
                    score: headline.score || null, // Include score if available
                }));
            } catch (error) {
                console.error("Error fetching headlines from OpenAI:", error);
                return [];
            }
        }

        async function fetchEvergreenTopics(): Promise<any[]> {
            try {
                console.log("🔄 Starting to process evergreen topics...");
        
                let evergreenTrends: any[] = [];
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
        
                for (const topic of evergreenTopics) {
                    const topicRecords = records.filter(record => 
                        Array.isArray(record.evergreen_topics) && record.evergreen_topics.includes(topic)
                    );
                    const feedbackSummaries = topicRecords.map(record => record.summary).filter(summary => summary?.trim() !== "");
        
                    if (feedbackSummaries.length === 0) {
                        console.log(`⚠️ No summaries found for topic: "${topic}". Skipping...`);
                        continue;
                    }
        
                    console.log(`✅ Processing topic: "${topic}" with ${feedbackSummaries.length} feedback summaries.`);
        
                    const evergreenPrompt = `
                        You are an AI assistant specialized in natural language processing, particularly in topic modeling and text analysis.
                        You will be given a list of summaries of feedback from the public to analyze, and an evergreen topic that some of these summaries of feedback may fall under.
                        Your task is to generate **exactly 3 trends or learning takeaways** for the evergreen topic, based on the feedback summaries that fall under this topic.
        
                        First, extract core themes, phrases, and words using Latent Dirichlet Allocation (LDA).
                        Use key terms and representative phrases to assist in topic identification.
                        Recognize and extract specific **locations, projects, policies, government decisions, and events** that appear in the feedback.
        
                        Second, compile only the relevant feedback for the evergreen topic and generate the top 3 trends or takeaways.
                        For each trend, ensure that you generate:
                        - A **headline**
                        - A **detailed description**
                        - A **sentiment score** (positive/neutral/negative)
                        - **Example feedback snippets**
        
                        **Return JSON in this exact format (as an array of objects):**
                        [
                            {
                                "headline": "Headline of the trend",
                                "desc": "Detailed description of the trend",
                                "score": "positive/neutral/negative",
                                "examples": [
                                    "Example feedback snippet 1",
                                    "Example feedback snippet 2",
                                    "Example feedback snippet 3"
                                ]
                            },
                            {
                                "headline": "Headline of the second trend",
                                "desc": "Detailed description of the second trend",
                                "score": "positive/neutral/negative",
                                "examples": [
                                    "Example feedback snippet 1",
                                    "Example feedback snippet 2",
                                    "Example feedback snippet 3"
                                ]
                            },
                            {
                                "headline": "Headline of the third trend",
                                "desc": "Detailed description of the third trend",
                                "score": "positive/neutral/negative",
                                "examples": [
                                    "Example feedback snippet 1",
                                    "Example feedback snippet 2",
                                    "Example feedback snippet 3"
                                ]
                            }
                        ]

                        Only return valid JSON. Do not include any other text.

                        **Evergreen Topic:** "${topic}"
                        **Feedback Summaries:** ${JSON.stringify(feedbackSummaries)}
                    `;
        
                    const response = await generateText({
                        model: customModel("gemini-2.0-flash"),
                        prompt: evergreenPrompt,
                        maxTokens: 4096,
                        temperature: 0.7,
                        maxSteps: 1,
                    });
        
                    // Log raw response for debugging
                    const rawText = response.text.trim();

                    // Clean and parse JSON response
                    let parsedData: any[] = [];
                    try {
                        const cleanedText = rawText.replace(/^```json\n/, "").replace(/\n```$/, ""); // Remove markdown
                        parsedData = JSON.parse(cleanedText); // Parse JSON
                        console.log(`✅ Successfully parsed JSON for topic: "${topic}"`);
                    } catch (error) {
                        console.error(`❌ Failed to parse JSON for topic: "${topic}":`, error);
                        continue; // Skip this topic and move on
                    }

                    // Format and store results
                    parsedData.forEach((trend: any, index: number) => {
                        console.log(`🔍 Processing trend #${index + 1} for topic: "${topic}"`);
                        console.log("📝 Raw trend data:", trend);

                        if (!trend.headline || !trend.desc) {
                            console.warn(`⚠️ Skipping invalid trend (missing title or description) for topic: "${topic}"`);
                            return;
                        }

                        const formattedTrend = {
                            title: trend.headline,
                            match_percent: "N/A", // Not applicable for evergreen topics
                            desc: trend.desc,
                            entities: "",
                            examples: trend.examples ? trend.examples.join(" | ") : "No examples",
                            category: "Evergreen",
                            date_processed: new Date(),
                            type: "evergreen",
                            topic: topic,
                            score: trend.score,
                        };

                        console.log("✅ Adding formatted trend:", formattedTrend);
                        evergreenTrends.push(formattedTrend);
                    });
                }

                console.log(`✅ Total evergreen headlines generated: ${evergreenTrends.length}`);
                return evergreenTrends;

            } catch (error) {
                console.error("🚨 Error fetching evergreen trends:", error);
                return [];
            }
        }


        // Fetch today's headlines (from yesterday onwards) and overall headlines
        const todayHeadlinesData = await fetchHeadlines(new Date(new Date().setDate(new Date().getDate() - 1)));
        const overallHeadlinesData = await fetchHeadlines();
        const evergreenTrendsData = await fetchEvergreenTopics();

        // Combine today's headlines and overall headlines
        const allHeadlines = [...todayHeadlinesData, ...overallHeadlinesData, ...evergreenTrendsData];

        // Call the saveHeadlines function to save the new headlines
        const result = await saveHeadlines(allHeadlines);

        // Return success response
        return new Response(
            JSON.stringify({ message: "Headlines saved successfully", result }),
            {
                status: 201,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
    } catch (error) {
        console.error('Error saving headlines:', error);
        return new Response("Error saving headlines", { status: 500 });
    }
}