import { randomUUID } from "node:crypto";
import { getOpenAiClient } from "@/libs/openai";
import { isAccountPlanning, isAssetExamples, isRecord } from "@/libs/account-model";
import { readJsonBody } from "@/libs/request-json";

const assetProperties = {
  id: { type: "string" },
  name: { type: "string" },
  symbol: { type: "string" },
  category: { type: "string" },
  risk: { type: "string" },
  time_horizon: { type: "string" },
  liquidity: { type: "string" },
  cost: { type: "string" },
  why_it_may_fit: { type: "string" },
  what_to_watch: { type: "string" },
  summary: { type: "string" },
} as const;

const assetSchema = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "summary", "assets"],
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    assets: {
      type: "array",
      minItems: 7,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: Object.keys(assetProperties),
        properties: assetProperties,
      },
    },
  },
} as const;

const recentRequests = new Map<string, number[]>();
const MAX_REQUESTS_PER_MINUTE = 12;
const MAX_BODY_BYTES = 16_000;

function allowRequest(req: Request) {
  const requestUrl = new URL(req.url);
  const origin = req.headers.get("origin");
  if (origin && origin !== requestUrl.origin) return false;

  const client = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (recentRequests.get(client) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= MAX_REQUESTS_PER_MINUTE) return false;
  recent.push(now);
  recentRequests.set(client, recent);
  return true;
}

export async function POST(req: Request) {
  if (!allowRequest(req)) return new Response("Too many or invalid requests", { status: 429 });
  const parsed = await readJsonBody(req, MAX_BODY_BYTES);
  if (!parsed.ok) {
    return new Response(parsed.status === 413 ? "Request is too large" : "Invalid JSON request", { status: parsed.status });
  }
  if (!isRecord(parsed.value)) return new Response("Invalid request", { status: 400 });
  const { accountName, planning } = parsed.value;
  if (typeof accountName !== "string" || !accountName.trim() || accountName.length > 100) {
    return new Response("A valid account name is required", { status: 400 });
  }
  if (!isAccountPlanning(planning)) return new Response("Invalid account planning details", { status: 400 });

  try {
    const response = await getOpenAiClient().responses.create({
      model: "gpt-5-mini",
      reasoning: { effort: "minimal" },
      instructions: `Create seven educational, illustrative financial-product cards for a product-exploration screen. This is not personalized financial advice, a recommendation, or a prediction. Do not use real tickers, real funds, real companies, performance figures, guarantees, or calls to buy. Invent neutral, clearly fictional product names and symbols.

Use the planning profile only to vary the examples' broad risk, liquidity, time horizon, and explanations. Include a range of understandable product categories. Be especially cautious when the profile indicates low risk tolerance or short liquidity needs. Keep every field short, plain-English, and balanced.`,
      input: JSON.stringify({
        account_name: accountName.trim(),
        planning: {
          target_amount: planning.targetAmount,
          liquidity_needs: planning.liquidityNeeds,
          loss_reaction: planning.lossReaction,
          risk_attitude: planning.riskAttitude,
          preferred_products: planning.preferredProducts,
          excluded_industries: planning.excludedIndustries,
        },
      }),
      text: {
        format: {
          type: "json_schema",
          name: "illustrative_account_assets",
          strict: true,
          schema: assetSchema,
        },
      },
    });

    const generated: unknown = JSON.parse(response.output_text);
    if (!isRecord(generated)) throw new Error("The AI response did not match the asset examples schema.");
    const result = {
      ...generated,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    if (!isAssetExamples(result)) throw new Error("The AI response did not match the asset examples schema.");
    return Response.json(result);
  } catch (error) {
    console.error("Illustrative asset generation failed", error);
    return new Response("Unable to create illustrative assets", { status: 502 });
  }
}
