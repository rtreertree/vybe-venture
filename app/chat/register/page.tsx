"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Checklist } from "@/components/Checklist";
import { ChatComposerTextarea } from "@/components/chat-composer-textarea";
import { useChat } from "@/hooks/useChat";
import { sanitizeState, type ChatMessage, type Profile } from "@/libs/chat-shared";
import {
    accountSlug,
    readAccounts,
    readPersonalProfile,
    readRecord,
    writeAccounts,
    writePersonalProfile,
    type AccountRecord,
} from "@/libs/account-client";
import type { AccountPlanning, PersonalProfile } from "@/libs/account-model";

const CHAT_DRAFT_KEY = "chat_register_draft";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function profileText(profile: Profile, key: string) {
    const value = profile[key];
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function personalFromProfile(profile: Profile): PersonalProfile {
    const ageValue = profile.age;
    const parsedAge = typeof ageValue === "string" ? Number(ageValue) : Number.NaN;

    return {
        name: profileText(profile, "name"),
        age: Number.isInteger(parsedAge) && parsedAge >= 18 && parsedAge <= 120 ? parsedAge : null,
        gender: profileText(profile, "gender"),
        investmentExperience: profileText(profile, "investment_experience"),
        job: profileText(profile, "job"),
        income: profileText(profile, "income"),
        incomeSources: profileText(profile, "income_sources"),
        regularExpenses: profileText(profile, "main_expenses"),
    };
}

function planningFromProfile(profile: Profile): AccountPlanning {
    const targetValue = profile.target_value;

    return {
        targetAmount: typeof targetValue === "number" && Number.isFinite(targetValue) && targetValue >= 0
            ? { amount: targetValue, currency: "USD" }
            : null,
        liquidityNeeds: profileText(profile, "liquidity_needs"),
        lossReaction: profileText(profile, "loss_reaction"),
        riskAttitude: profileText(profile, "risk_attitude"),
        preferredProducts: profileText(profile, "preferred_products"),
        excludedIndustries: profileText(profile, "excluded_industries"),
    };
}

function timeframeYearsFromProfile(profile: Profile) {
    const timeframe = profile.timeframe;
    if (typeof timeframe !== "string") return null;

    const match = /^\s*(\d{1,2})\s*(?:years?|yrs?)?\s*$/iu.exec(timeframe);
    if (!match) return null;
    const years = Number(match[1]);
    return Number.isInteger(years) && years >= 1 && years <= 50 ? years : null;
}

function restoreMessages(value: unknown): ChatMessage[] {
    if (!Array.isArray(value)) return [];

    const messages = value
        .filter((message): message is ChatMessage => {
            if (!isRecord(message)) return false;
            return (message.role === "user" || message.role === "assistant") && typeof message.content === "string";
        })
        .slice(-40)
        .map((message) => ({ role: message.role, content: message.content.slice(0, 2_000) }));

    if (messages.at(-1)?.role === "assistant" && !messages.at(-1)?.content) messages.pop();
    return messages;
}

function LoadingDots() {
    return (
        <span role="status" aria-label="Agent is responding" className="inline-flex h-6 w-10 items-center justify-between">
            {[220, 0, 110].map((delay, dotIndex) => (
                <span
                    key={dotIndex}
                    aria-hidden="true"
                    className={`chat-typing-dot h-2 w-2 rounded-full ${["bg-accent", "bg-growth", "bg-secondary"][dotIndex]}`}
                    style={{ animationDelay: `${delay}ms` }}
                />
            ))}
        </span>
    );
}

export default function ChatPage() {
    const router = useRouter();
    const [input, setInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [draftWarning, setDraftWarning] = useState<string | null>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const messageListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        let frame = 0;
        let lastHeight = 0;
        let lastTop = -1;
        const updateHeight = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(() => {
                frame = 0;
                const visualViewport = window.visualViewport;
                const height = Math.round(visualViewport?.height ?? window.innerHeight);
                const top = Math.round(visualViewport?.offsetTop ?? 0);
                if (lastHeight !== height) {
                    viewport.style.height = `${height}px`;
                    lastHeight = height;
                }
                if (lastTop !== top) {
                    viewport.style.top = `${top}px`;
                    lastTop = top;
                }
            });
        };
        updateHeight();
        window.visualViewport?.addEventListener("resize", updateHeight);
        window.visualViewport?.addEventListener("scroll", updateHeight);
        window.addEventListener("resize", updateHeight);
        return () => {
            window.cancelAnimationFrame(frame);
            window.visualViewport?.removeEventListener("resize", updateHeight);
            window.visualViewport?.removeEventListener("scroll", updateHeight);
            window.removeEventListener("resize", updateHeight);
        };
    }, []);

    const { fields, messages, state, isStreaming, isComplete, error, send, stop, hydrate } = useChat({
        intake: "profile",
    });
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const fallbackMessage = "Hi there! 👋 Let's get you set up. What's your name?";

        try {
            const savedChat = window.localStorage.getItem(CHAT_DRAFT_KEY);
            if (savedChat) {
                try {
                    const parsed: unknown = JSON.parse(savedChat);
                    if (isRecord(parsed)) {
                        const restoredMessages = restoreMessages(parsed.messages);
                        if (restoredMessages.length) {
                            const restoredState = sanitizeState(parsed.state, fields);
                            hydrate(restoredState.profile, restoredMessages, restoredState.counters);
                            return;
                        }
                    }
                    window.localStorage.removeItem(CHAT_DRAFT_KEY);
                } catch {
                    window.localStorage.removeItem(CHAT_DRAFT_KEY);
                    window.setTimeout(() => {
                        setDraftWarning("We couldn't restore the saved conversation, so you can continue with the details from your earlier steps.");
                    }, 0);
                }
            }

            const saved = window.localStorage.getItem("questionnaire_register");
            const accountsResult = readAccounts();
            if (!accountsResult.ok) throw new Error(accountsResult.message);
            const previousAccounts = accountsResult.accounts;
            const profileResult = readPersonalProfile();
            if (!profileResult.ok) throw new Error(profileResult.message);
            const savedProfile = profileResult.profile;
            if (!saved && previousAccounts.length === 0) {
                hydrate({ name: null, age: null, gender: null, job: null, income: null }, [{ role: "assistant", content: fallbackMessage }]);
                return;
            }

            const questionnaire = saved ? JSON.parse(saved) as Record<string, unknown> : {};
            const accountSaved = window.localStorage.getItem("account_register");
            const account = accountSaved ? JSON.parse(accountSaved) as Record<string, unknown> : null;
            const questionnaireName = typeof questionnaire.fullName === "string" ? questionnaire.fullName.trim() : "";
            const questionnaireAge = typeof questionnaire.age === "number" ? String(questionnaire.age) : null;
            const questionnaireGender = typeof questionnaire.gender === "string" ? questionnaire.gender : null;
            const investmentExperience = typeof questionnaire.investmentExperience === "string" ? questionnaire.investmentExperience.trim() || null : null;
            const income = typeof questionnaire.incomeAmount === "number" ? `$${questionnaire.incomeAmount.toLocaleString()} per year` : null;
            const name = savedProfile?.name ?? questionnaireName;
            const profile: Profile = {
                name: name || null,
                age: savedProfile?.age === null || savedProfile?.age === undefined ? questionnaireAge : String(savedProfile.age),
                gender: savedProfile?.gender ?? questionnaireGender,
                investment_experience: savedProfile?.investmentExperience ?? investmentExperience,
                job: savedProfile?.job ?? null,
                income: savedProfile?.income ?? income,
                income_sources: savedProfile?.incomeSources ?? null,
                main_expenses: savedProfile?.regularExpenses ?? null,
            };
            const firstName = name.split(/\s+/)[0];
            const accountName = typeof account?.accountName === "string" ? account.accountName.trim() : "";
            const goal = typeof account?.goal === "string" ? account.goal.trim() : "";
            const accountContext = accountName && goal ? ` I also have your ${accountName} account, which is working toward ${goal}.` : "";
            const welcome = investmentExperience
                ? "I have the details you shared, including your investing experience, so we can skip the paperwork."
                : saved ? "I have the details you shared, so we can skip the paperwork." : "I have some details from your existing account.";
            const carriedDetails = [
                profile.job && "work",
                profile.income && "income",
                profile.income_sources && "income sources",
                profile.main_expenses && "regular expenses",
            ].filter((detail): detail is string => Boolean(detail));
            const carriedSummary = carriedDetails.length > 1
                ? `${carriedDetails.slice(0, -1).join(", ")}${carriedDetails.length > 2 ? "," : ""} and ${carriedDetails[carriedDetails.length - 1]}`
                : carriedDetails[0] ?? "";
            const carryForwardMessage = carriedDetails.length
                ? ` I’ve carried forward your details about ${carriedSummary} from your existing profile, so you don’t need to repeat them. Tell me if anything has changed.`
                : "";
            const nextQuestion: Record<string, string> = {
                job: "What do you do for work?",
                income_sources: "What are your sources of income?",
                main_expenses: "What regular expenses or financial commitments should we keep in mind?",
                target_value: "What amount in USD are you hoping this account will reach?",
                timeframe: "About how many years do you expect to keep this money in the account before using it? A rough estimate is fine.",
                liquidity_needs: "When might you need access to this money?",
                loss_reaction: "How might you feel if this account temporarily lost value?",
                risk_attitude: "How comfortable are you with investment risk?",
                preferred_products: "Are there any investment products or approaches you prefer?",
                excluded_industries: "Are there industries or activities you would prefer to avoid?",
            };
            const firstMissingField = Object.keys(fields).find((field) => profile[field] === null || profile[field] === undefined);
            const openingPrompt = firstMissingField
                ? nextQuestion[firstMissingField] ?? "What would be most helpful to know about this account?"
                : "You’re all set. Press Next to continue.";

            hydrate(profile, [{
                role: "assistant",
                content: firstName
                    ? `Welcome, ${firstName}. ${welcome}${accountContext}${carryForwardMessage} ${openingPrompt}`
                    : `${welcome}${accountContext}${carryForwardMessage} ${openingPrompt}`,
            }]);
        } catch (error) {
            const warning = error instanceof Error
                ? error.message
                : "Saved setup data could not be read. Your local data has not been changed.";
            window.setTimeout(() => setDraftWarning(warning), 0);
            hydrate({ name: null, age: null, gender: null, job: null, income: null }, [{ role: "assistant", content: fallbackMessage }]);
        } finally {
            setIsReady(true);
        }
    }, [fields, hydrate]);

    useEffect(() => {
        if (!isReady || !messages.length) return;

        const timeout = window.setTimeout(() => {
            try {
                window.localStorage.setItem(CHAT_DRAFT_KEY, JSON.stringify({ state, messages }));
                setDraftWarning(null);
            } catch {
                setDraftWarning("We couldn't save your conversation progress in this browser. Keep this tab open until you finish.");
            }
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [isReady, messages, state]);

    useEffect(() => {
        const list = messageListRef.current;
        if (list) list.scrollTop = list.scrollHeight;
    }, [messages]);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!isReady || isStreaming || !input.trim()) return;
        send(input);
        setInput("");
    };

    const next = async () => {
        setIsSaving(true);
        setSaveError(null);

        try {
            const sanitizationResponse = await fetch("/api/profile-sanitize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profile: state.profile, messages }),
            });
            if (!sanitizationResponse.ok) throw new Error("Sanitization failed");

            const sanitized = await sanitizationResponse.json() as { planning?: Profile };
            if (!sanitized.planning) throw new Error("Invalid sanitized profile");

            const account = readRecord(window.localStorage.getItem("account_register"));
            if (!account) throw new Error("Account details missing");
            const accountName = typeof account?.accountName === "string" ? account.accountName.trim() : "New account";
            const accountGoal = typeof account?.goal === "string" ? account.goal.trim() : "No goal specified";
            const accountId = typeof account.id === "string" ? account.id : null;
            if (!accountId) throw new Error("Account ID missing");
            const personal = personalFromProfile(sanitized.planning);
            const personalProfileResult = readPersonalProfile();
            if (!personalProfileResult.ok) throw new Error(personalProfileResult.message);
            const accountsResult = readAccounts();
            if (!accountsResult.ok) throw new Error(accountsResult.message);
            const newAccount: AccountRecord = {
                schemaVersion: 2,
                id: accountId,
                accountName,
                goal: accountGoal,
                timeframeYears: timeframeYearsFromProfile(sanitized.planning),
                planning: planningFromProfile(sanitized.planning),
                createdAt: new Date().toISOString(),
                selectedProducts: [],
                assetExamples: null,
            };
            const existingAccounts = accountsResult.accounts;
            if (existingAccounts.some((item) => item.id === accountId)) throw new Error("Account already exists");
            writePersonalProfile(personal);
            writeAccounts([...existingAccounts, newAccount]);
            window.localStorage.removeItem(CHAT_DRAFT_KEY);
            window.localStorage.removeItem("questionnaire_draft");
            window.localStorage.removeItem("questionnaire_register");
            window.localStorage.removeItem("account_draft");
            window.localStorage.removeItem("account_register");
            router.push(`/account/${encodeURIComponent(accountSlug(accountName, accountId))}/create`);
        } catch (error) {
            setSaveError(error instanceof Error
                ? error.message
                : "We couldn't create this account on this device. Please try again.");
            setIsSaving(false);
        }
    };

    return (
        <div ref={viewportRef} className="fixed inset-x-0 top-0 flex h-dvh min-h-0 flex-col overflow-hidden bg-light-surface text-primary">
            <header className="border-b border-primary/10 bg-light-surface">
                <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-5 sm:px-8">
                    <Link href="/" className="font-display text-sm font-bold sm:text-base">
                        {process.env.NEXT_PUBLIC_APP_NAME || "CANT LOAD ENV"}<span className="text-accent">.</span>
                    </Link>
                    <p className="inline-flex items-center gap-2 rounded-full border border-growth/30 bg-growth/10 px-3 py-2 text-xs font-semibold uppercase text-secondary">
                        <span className="h-2 w-2 rounded-full bg-growth" aria-hidden />
                        Finish your plan
                    </p>
                </div>
            </header>

            <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-5 sm:px-8">
                <div className="border-b border-primary/10">
                    <Checklist fields={fields} profile={state.profile} />
                </div>
                <div ref={messageListRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain py-6 sm:py-8">
                    {!isReady && <div className="flex items-center gap-3 text-sm text-secondary"><span className="handoff-pulse h-2 w-2 rounded-full bg-growth" aria-hidden /> Bringing your answers into the conversation…</div>}
                    {messages.map((m, i) => (
                        <div key={i} className={`flex flex-col gap-1.5 ${m.role === "user" ? "items-end" : "items-start"}`}>
                            <span className={`flex items-center gap-2 px-1 text-[10px] font-bold uppercase text-secondary ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                                {m.role === "user" ? "You" : <><span className="h-1.5 w-1.5 rounded-full bg-growth" aria-hidden /> {process.env.NEXT_PUBLIC_APP_NAME || "CAN'T LOAD ENV"}</>}
                            </span>
                            <span className={`inline-block max-w-[85%] wrap-anywhere whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${m.role === "user" ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-primary/10 bg-white text-primary shadow-sm shadow-primary/5"}`}>
                                {m.content || (m.role === "assistant" && isStreaming && i === messages.length - 1 ? <LoadingDots /> : "…")}
                            </span>
                        </div>
                    ))}
                    {(error || saveError || draftWarning) && <p role="alert" className="text-sm text-risk">{error || saveError || draftWarning}</p>}
                </div>

                <div className="shrink-0 border-t border-primary/15 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:py-5">
                    {isComplete && !isStreaming ? (
                        <button
                            onClick={next}
                            disabled={isSaving}
                            className="min-h-12 w-full rounded-full bg-growth px-4 font-semibold text-primary transition-colors hover:bg-growth/90 disabled:opacity-50"
                        >
                            {isSaving ? "Saving…" : "Next"}
                        </button>
                    ) : (
                        <form onSubmit={submit} className="flex items-end gap-2 rounded-2xl border border-primary/15 bg-white p-1.5 shadow-sm shadow-primary/5 focus-within:border-accent">
                            <label htmlFor="register-chat-message" className="sr-only">Your message</label>
                            <ChatComposerTextarea
                                id="register-chat-message"
                                className="min-h-12 min-w-0 flex-1 rounded-xl bg-transparent px-3 py-3 text-primary outline-none placeholder:text-secondary/60 disabled:opacity-50"
                                value={input}
                                maxLength={2000}
                                keyboardScroll={false}
                                disabled={!isReady || isComplete}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type a message…"
                            />
                            {isStreaming ? (
                                <button type="button" onClick={stop} className="min-h-12 rounded-xl bg-risk px-4 font-semibold text-white transition-opacity hover:opacity-90">
                                    Stop
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={!isReady || isComplete || !input.trim()}
                                    className="min-h-12 rounded-xl bg-accent px-4 font-semibold text-primary transition-colors hover:bg-accent/90 disabled:opacity-50"
                                >
                                    Send
                                </button>
                            )}
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
}
