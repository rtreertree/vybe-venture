export type ChatMessage = { role: "user" | "assistant"; content: string };

export type FieldsConfig = Record<string, string>;
export type Profile = Record<string, string | number | null>;
export type Counters = { related: number; unrelated: number };
export type ChatState = { profile: Profile; counters: Counters };

export type StreamEvent =
    | { type: "state"; state: ChatState }
    | { type: "delta"; text: string };

export const MAX_RELATED = 2;
export const MAX_UNRELATED = 2;

const KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;
const RESERVED_KEYS = ["turn_type"];

export function assertValidFields(fields: FieldsConfig) {
    const keys = Object.keys(fields);
    if (keys.length === 0) throw new Error("Fields config is empty");
    for (const key of keys) {
        if (!KEY_PATTERN.test(key) || RESERVED_KEYS.includes(key)) {
            throw new Error(`Invalid field key: "${key}"`);
        }
        if (!fields[key].trim()) throw new Error(`Field "${key}" needs a description`);
    }
}

export const emptyState = (fields: FieldsConfig): ChatState => ({
    profile: Object.fromEntries(Object.keys(fields).map((k) => [k, null])),
    counters: { related: 0, unrelated: 0 },
});

export const isComplete = (p: Profile) => {
    const values = Object.values(p);
    return values.length > 0 && values.every((v) => v !== null);
};

export const cleanStr = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : null;

const cleanProfileValue = (key: string, value: unknown): string | number | null => {
    if (key === "target_value") {
        return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100_000_000 ? value : null;
    }

    if (key === "age" && (typeof value === "string" || typeof value === "number")) {
        const ageText = String(value).trim();
        if (!/^\d+$/u.test(ageText)) return null;
        const age = Number(ageText);
        return Number.isInteger(age) && age >= 18 && age <= 120 ? String(age) : null;
    }

    return cleanStr(value);
};

export const labelOf = (key: string) => {
    const spaced = key.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

export function sanitizeState(raw: unknown, fields: FieldsConfig): ChatState {
    const s = emptyState(fields);
    const root = isRecord(raw) ? raw : {};
    const p = isRecord(root.profile) ? root.profile : {};
    const c = isRecord(root.counters) ? root.counters : {};

    for (const key of Object.keys(fields)) {
        s.profile[key] = cleanProfileValue(key, p[key]);
    }

    const clamp = (n: unknown, max: number) =>
        Math.min(Math.max(typeof n === "number" && Number.isInteger(n) ? n : 0, 0), max);
    s.counters.related = clamp(c.related, MAX_RELATED);
    s.counters.unrelated = clamp(c.unrelated, MAX_UNRELATED);
    return s;
}
