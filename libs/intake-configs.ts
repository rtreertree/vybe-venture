import { assertValidFields, type FieldsConfig } from "@/libs/chat-shared";

export const INTAKE_CONFIGS = {
    profile: {
        name: "The user's first name or what they like to be called",
        age: "The user's age in whole years (a number from 18 to 120)",
        gender: "The user's gender, in their own words",
        investment_experience: "The user's self-described level of investing experience",
        job: "The user's job or occupation",
        income: "The user's income, keeping currency and period (e.g. $4,000/month). A rough figure is fine. This is sensitive, so ask gently.",
        income_sources: "The user's sources of income. They may list several, such as salary, freelance work, business income, investments, or benefits.",
        main_expenses: "The user's main regular expenses or financial commitments, in their own words.",
        target_value: "The target amount in USD the user wants this account to reach (from 0 to 100,000,000). Store the amount as a number without a currency symbol or commas.",
        timeframe: "The number of whole years (1 to 50) the user expects to keep money in this account before using it. When explicitly stated, store the number as a string; do not infer it from their goal.",
        liquidity_needs: "How soon the user may need to access money in this account and how much flexibility they need.",
        loss_reaction: "How the user thinks they would react if this account temporarily lost value.",
        risk_attitude: "The user's overall comfort with investment risk, in their own words.",
        preferred_products: "Investment products or approaches the user prefers, if any.",
        excluded_industries: "Industries, companies, or activities the user prefers to avoid, if any.",
    },
    // example of a second form:
    // newsletter: {
    //     email: "The user's email address",
    //     topics: "Topics the user wants to hear about",
    // },
} satisfies Record<string, FieldsConfig>;

export type IntakeId = keyof typeof INTAKE_CONFIGS;

Object.values(INTAKE_CONFIGS).forEach(assertValidFields);

/** Safe lookup for untrusted ids. Returns null when unknown. */
export function getIntakeConfig(id: unknown): FieldsConfig | null {
    if (typeof id !== "string") return null;
    if (!Object.prototype.hasOwnProperty.call(INTAKE_CONFIGS, id)) return null;
    return INTAKE_CONFIGS[id as IntakeId];
}
