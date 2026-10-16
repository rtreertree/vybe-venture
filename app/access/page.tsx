"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { browserToken, setBrowserToken, tokenHeaders, USER_TOKEN_PATTERN } from "@/libs/user-token";

export default function AccessPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [generated, setGenerated] = useState("");
  const [existingCode, setExistingCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setExistingCode(browserToken() ?? ""), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (window.location.search.includes("switch=1")) return;
    if (!browserToken()) return;
    fetch("/api/identity", { headers: tokenHeaders(), cache: "no-store" })
      .then((response) => { if (response.ok) router.replace("/dashboard"); })
      .catch(() => setError("The database is unavailable. Please try again."));
  }, [router]);

  const submit = async (action: "enter" | "generate") => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/identity", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, token: code.trim().toUpperCase() }),
      });
      if (!response.ok) throw new Error(await response.text());
      const result = await response.json() as { token: string };
      if (!USER_TOKEN_PATTERN.test(result.token)) throw new Error("Invalid account code returned.");
      setBrowserToken(result.token);
      if (action === "generate") {
        setGenerated(result.token);
      } else {
        router.replace("/dashboard");
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not access your account.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="flex min-h-dvh items-center justify-center bg-light-surface px-5 py-10 text-primary">
    <main className="w-full max-w-lg rounded-3xl border border-primary/10 bg-white p-7 shadow-sm sm:p-10">
      <Link href="/" className="font-display text-sm font-bold">{process.env.NEXT_PUBLIC_APP_NAME || "VYBE VENTURE"}<span className="text-accent">.</span></Link>
      <h1 className="mt-8 font-display text-3xl font-bold">Your account code</h1>
      <p className="mt-3 text-sm leading-6 text-ink/70">Enter your existing five-character code, or generate one before starting. This code opens your saved profile and accounts. Keep it private and save it somewhere you can find it again.</p>
      {existingCode && !generated && <p className="mt-5 rounded-lg bg-light-surface p-3 text-sm">Current code: <strong className="font-mono tracking-widest">{existingCode}</strong></p>}
      {generated ? <div className="mt-7 rounded-2xl border border-growth/30 bg-growth/10 p-5">
        <p className="text-sm font-semibold">Save this code before continuing</p>
        <p className="mt-3 select-all font-mono text-4xl font-bold tracking-[0.3em]">{generated}</p>
        <button className="mt-5 min-h-11 bg-accent px-5 font-semibold" onClick={() => router.replace("/question/register")}>I saved my code — continue</button>
      </div> : <>
        <label htmlFor="account-code" className="mt-7 block text-sm font-semibold">Existing code</label>
        <input id="account-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
          maxLength={5} autoComplete="off" inputMode="text" className="mt-2 min-h-12 w-full rounded-lg border border-primary/25 px-4 font-mono text-xl tracking-[0.25em] outline-none focus:border-accent" placeholder="ABCDE" />
        <button type="button" disabled={busy || !USER_TOKEN_PATTERN.test(code)} onClick={() => void submit("enter")}
          className="mt-4 min-h-12 w-full bg-accent px-5 font-semibold disabled:opacity-50">Continue with code</button>
        <div className="my-6 flex items-center gap-3 text-xs text-secondary"><span className="h-px flex-1 bg-primary/15" />OR<span className="h-px flex-1 bg-primary/15" /></div>
        <button type="button" disabled={busy} onClick={() => void submit("generate")}
          className="min-h-12 w-full border border-primary/25 px-5 font-semibold disabled:opacity-50">Generate a new code</button>
      </>}
      {error && <p role="alert" className="mt-5 text-sm text-risk">{error}</p>}
      <p className="mt-7 text-xs leading-5 text-secondary">Anyone with this short code can access its data. Use sample financial details while this prototype uses code-only access.</p>
    </main>
  </div>;
}
