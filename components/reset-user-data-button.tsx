"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

const USER_DATA_KEYS = [
  "questionnaire_draft",
  "questionnaire_register",
  "account_draft",
  "account_register",
  "chat_register_draft",
  "planning_profile",
  "onboarding_register",
  "accounts_register",
  "personal_profile",
];

export function ResetUserDataButton() {
  const [message, setMessage] = useState("");

  const reset = () => {
    if (!window.confirm("Clear all saved prototype data from this browser? This cannot be undone.")) return;

    try {
      USER_DATA_KEYS.forEach((key) => window.localStorage.removeItem(key));
      for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
        const key = window.localStorage.key(index);
        if (key?.startsWith("consult_chat_")) window.localStorage.removeItem(key);
      }
      setMessage("Saved data cleared.");
    } catch {
      setMessage("Saved data could not be cleared.");
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={reset}
        className="inline-flex min-h-10 items-center gap-1.5 px-2 text-xs font-semibold text-primary/60 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-label="Clear saved prototype data"
      >
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Reset data</span>
      </button>
      {message && <p role="status" className="absolute right-0 top-full z-40 mt-2 w-44 border border-primary/15 bg-white p-2 text-xs text-primary shadow-sm">{message}</p>}
    </div>
  );
}
