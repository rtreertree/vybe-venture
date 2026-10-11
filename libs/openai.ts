import "server-only";
import OpenAI from "openai";

declare global {
    var openaiClient: OpenAI | undefined;
}

export const openaiClient = globalThis.openaiClient || new OpenAI({
    apiKey: process.env.OPENAI_KEY || "",
});

console.log("OpenAI client initialized:", !!openaiClient);


if (process.env.NODE_ENV !== "production") {
    globalThis.openaiClient = openaiClient;
}