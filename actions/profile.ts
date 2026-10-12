"use server";

import { cookies } from "next/headers";
import { isComplete, sanitizeState, type Profile } from "@/libs/chat-shared";
import { getIntakeConfig } from "@/libs/intake-configs";

export async function saveProfile(intake: string, raw: Profile) {
    const fields = getIntakeConfig(intake);
    if (!fields) throw new Error("Unknown intake");

    const { profile } = sanitizeState({ profile: raw }, fields);
    if (!isComplete(profile)) throw new Error("Profile incomplete");

    const store = await cookies();
    store.set(`intake_${intake}`, JSON.stringify(profile), {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
    });
}