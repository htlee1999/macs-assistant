import { google} from "@ai-sdk/google";
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";
import { streamText } from "ai";
import { match } from "ts-pattern";
import { customModel } from "@/lib/ai";

// IMPORTANT! Set the runtime to edge: https://vercel.com/docs/functions/edge-functions/edge-runtime
export const runtime = "edge";

export async function POST(req: Request): Promise<Response> {
  // Check if the OPENAI_API_KEY is set, if not return 400
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "") {
    return new Response("Missing OPENAI_API_KEY - make sure to add it to your .env file.", {
      status: 400,
    });
  }
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const ip = req.headers.get("x-forwarded-for");
    const ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(50, "1 d"),
    });

    const { success, limit, reset, remaining } = await ratelimit.limit(`novel_ratelimit_${ip}`);

    if (!success) {
      return new Response("You have reached your request limit for the day.", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }
  }

  const rules = `You are an AI writing assistant, helping someone to reply to an email. Abide by the following rules when writing.\n\n
  Use simple language.\n
  Avoid AI-giveaway phrases.\n
  Be direct and concise.\n
  Maintain a natural but also professional tone.\n
  Avoid marketing language.\n
  Keep it real.\n
  Simplify grammar.\n
  Stay away from fluff.\n
  Focus on clarity.\n`;


  const { prompt, option, command } = await req.json();
  const full_prompt = "Please only change the text in your response. Do not add any commentary" + prompt.replace(/<[^>]*>/g, '')
  console.log(option)
  const messages = match(option)
    .with("continue", () => [
      {
        role: "system",
        content: rules +
          "You will be continuing existing text based on context from prior text. " +
          "Give more weight/priority to the later characters than the beginning ones. " +
          "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
          "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: full_prompt,
      },
    ])
    .with("improve", () => [
      {
        role: "system",
        content: rules + 
          "You will be improving the existing text. " +
          "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
          "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `The existing text is: ${full_prompt}`,
      },
    ])
    .with("shorter", () => [
      {
        role: "system",
        content: rules + 
          "You will be shortening the following text appropriately. Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `The text is: ${full_prompt}`,
      },
    ])
    .with("longer", () => [
      {
        role: "system",
        content: rules +
          "You will be lengthening existing text. " +
          "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `The existing text is: ${full_prompt}`,
      },
    ])
    .with("fix", () => [
      {
        role: "system",
        content: rules +
          "You will be fixing grammar and spelling errors in existing text. " +
          "Limit your response to no more than 200 characters, but make sure to construct complete sentences." +
          "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `The existing text is: ${full_prompt}`,
      },
    ])
    .with("zap", () => [
      {
        role: "system",
        content: rules +
          "You will now generate text based on a given prompt. " +
          "You take an input from the user and a command for manipulating the text" +
          "Use Markdown formatting when appropriate.",
      },
      {
        role: "user",
        content: `For this text: ${full_prompt}. You have to respect the command: ${command}`,
      },
    ])
    .run();

  const result = await streamText({
    prompt: messages[0].content + "\n" + messages[1].content,
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    model: customModel("gemini-2.0-flash") ,
  });

  return result.toDataStreamResponse();
}