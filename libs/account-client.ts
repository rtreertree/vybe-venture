"use client";

import { isAccountRecord, isPersonalProfile, isRecord, type AccountRecord, type PersonalProfile } from "@/libs/account-model";
import { tokenHeaders } from "@/libs/user-token";

export type { AccountRecord } from "@/libs/account-model";
export type AccountReadResult = { ok: true; accounts: AccountRecord[] } | { ok: false; message: string };
export type PersonalProfileReadResult = { ok: true; profile: PersonalProfile | null } | { ok: false; message: string };

export function accountSlug(name: string, id: string) {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "account";
  return `${base}--${id}`;
}

export function createAccountId() {
  return crypto.randomUUID();
}

async function fetchUserData() {
  const response = await fetch("/api/user-data", { headers: tokenHeaders(), cache: "no-store" });
  if (!response.ok) throw new Error(response.status === 401 ? "Enter your account code to continue." : "Saved data could not be loaded from the database.");
  const data: unknown = await response.json();
  if (!isRecord(data) || !Array.isArray(data.accounts) || !data.accounts.every(isAccountRecord)
    || (data.profile !== null && !isPersonalProfile(data.profile))) {
    throw new Error("The database returned invalid account data.");
  }
  return { accounts: data.accounts as AccountRecord[], profile: data.profile as PersonalProfile | null };
}

export async function readAccounts(): Promise<AccountReadResult> {
  try {
    const data = await fetchUserData();
    return { ok: true, accounts: data.accounts };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Saved accounts could not be loaded." };
  }
}

export async function readPersonalProfile(): Promise<PersonalProfileReadResult> {
  try {
    const data = await fetchUserData();
    return { ok: true, profile: data.profile };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Your profile could not be loaded." };
  }
}

export async function createAccountWithProfile(profile: PersonalProfile, account: AccountRecord) {
  if (!isPersonalProfile(profile) || !isAccountRecord(account)) throw new TypeError("Invalid account details.");
  const response = await fetch("/api/user-data", {
    method: "POST",
    headers: { ...tokenHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ profile, account }),
  });
  if (!response.ok) throw new Error(response.status === 409 ? "This account already exists." : "The account could not be saved to the database.");
  window.dispatchEvent(new Event("account-data-changed"));
}

export async function updateAccountRecord(accountId: string, update: (account: AccountRecord) => AccountRecord) {
  const result = await readAccounts();
  if (!result.ok) throw new Error(result.message);
  const account = result.accounts.find((item) => item.id === accountId);
  if (!account) throw new Error("This account is no longer available.");
  const updatedAccount = update(account);
  if (updatedAccount.id !== accountId || !isAccountRecord(updatedAccount)) throw new TypeError("Invalid account update.");
  const response = await fetch("/api/user-data", {
    method: "PATCH",
    headers: { ...tokenHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ account: updatedAccount }),
  });
  if (!response.ok) throw new Error("The account could not be saved to the database.");
  window.dispatchEvent(new Event("account-data-changed"));
  return result.accounts.map((item) => item.id === accountId ? updatedAccount : item);
}

export function readRecord(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
