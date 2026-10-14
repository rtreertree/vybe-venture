import { OpenAI } from "openai";

let openaiClient: OpenAI | null = null;

export function getOpenAiClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY at runtime.");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}
