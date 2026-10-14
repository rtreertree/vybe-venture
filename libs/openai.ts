import OpenAI from "openai";

let openaiClient: OpenAI | undefined;

export function getOpenAIClient(): OpenAI {
  if (openaiClient) {
    return openaiClient;
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY or OPENAI_KEY environment variable."
    );
  }

  openaiClient = new OpenAI({ apiKey });

  return openaiClient;
}