import { assertValidFields, type FieldsConfig } from "@/libs/chat-shared";

export const INTAKE_CONFIGS = {
    profile: {
        name: "The user's first name or what they like to be called",
        age: "The user's age in whole years (a number from 1 to 120)",
        gender: "The user's gender, in their own words",
        job: "The user's job or occupation",
        income: "The user's income, keeping currency and period (e.g. $4,000/month). A rough figure is fine. This is sensitive, so ask gently.",
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