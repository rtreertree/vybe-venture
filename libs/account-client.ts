"use client";

import {
  isAccountRecord,
  isRecord,
  isLegacyAccountRecord,
  isPersonalProfile,
  type LegacyAccountRecord,
  type AccountRecord,
  type AssetExamples,
  type PersonalProfile,
  type SelectedProduct,
} from "@/libs/account-model";

export const ACCOUNTS_STORAGE_KEY = "accounts_register";
export const PERSONAL_PROFILE_STORAGE_KEY = "personal_profile";

export type { AccountRecord } from "@/libs/account-model";

export type AccountReadResult =
  | { ok: true; accounts: AccountRecord[] }
  | { ok: false; message: string };

export type PersonalProfileReadResult =
  | { ok: true; profile: PersonalProfile | null }
  | { ok: false; message: string };

const EMPTY_PERSONAL_PROFILE: PersonalProfile = {
  name: null,
  age: null,
  gender: null,
  investmentExperience: null,
  job: null,
  income: null,
  incomeSources: null,
  regularExpenses: null,
};

export function accountSlug(name: string, id: string) {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "account";
  return `${base}--${id}`;
}

export function createAccountId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function yearsFromLegacyTimeframe(value: string | null) {
  if (!value) return null;
  const match = /^\s*(\d{1,2})\s*(?:years?|yrs?)\s*$/iu.exec(value);
  if (!match) return null;
  const years = Number(match[1]);
  return Number.isInteger(years) && years >= 1 && years <= 50 ? years : null;
}

function migrateLegacyAccount(account: LegacyAccountRecord): AccountRecord {
  const assetExamples: AssetExamples | null = account.assetExamples
    ? {
      ...account.assetExamples,
      id: `legacy-${account.id}`,
      createdAt: account.createdAt,
    }
    : null;
  const selectedProducts: SelectedProduct[] = assetExamples
    ? account.selectedProducts.flatMap((product) => {
      const asset = assetExamples.assets.find((item) => item.id === product.id);
      return asset ? [{ id: asset.id, name: asset.name, symbol: asset.symbol, examplesId: assetExamples.id }] : [];
    })
    : [];

  return {
    schemaVersion: 2,
    id: account.id,
    accountName: account.accountName,
    goal: account.goal,
    timeframeYears: yearsFromLegacyTimeframe(account.timeframe),
    planning: account.planning,
    createdAt: account.createdAt,
    selectedProducts,
    assetExamples,
  };
}

function mergeLegacyProfiles(accounts: LegacyAccountRecord[]): PersonalProfile {
  const profile = { ...EMPTY_PERSONAL_PROFILE };
  for (const account of [...accounts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))) {
    for (const key of Object.keys(profile) as (keyof PersonalProfile)[]) {
      if (profile[key] === null && account.personal[key] !== null) {
        switch (key) {
          case "name": profile.name = account.personal.name; break;
          case "age": profile.age = account.personal.age !== null && account.personal.age >= 18 ? account.personal.age : null; break;
          case "gender": profile.gender = account.personal.gender; break;
          case "investmentExperience": profile.investmentExperience = account.personal.investmentExperience; break;
          case "job": profile.job = account.personal.job; break;
          case "income": profile.income = account.personal.income; break;
          case "incomeSources": profile.incomeSources = account.personal.incomeSources; break;
          case "regularExpenses": profile.regularExpenses = account.personal.regularExpenses; break;
        }
      }
    }
  }
  return profile;
}

export function readPersonalProfile(): PersonalProfileReadResult {
  try {
    const saved = window.localStorage.getItem(PERSONAL_PROFILE_STORAGE_KEY);
    if (saved === null) return { ok: true, profile: null };
    const parsed: unknown = JSON.parse(saved);
    if (!isPersonalProfile(parsed)) {
      return { ok: false, message: "The saved personal profile is invalid. Your local data has not been changed." };
    }
    return { ok: true, profile: parsed };
  } catch {
    return { ok: false, message: "Personal profile storage could not be read. Your local data has not been changed." };
  }
}

export function writePersonalProfile(profile: PersonalProfile) {
  if (!isPersonalProfile(profile)) throw new TypeError("Cannot save an invalid personal profile.");
  window.localStorage.setItem(PERSONAL_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function readAccounts(): AccountReadResult {
  try {
    const saved = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    const parsed: unknown = saved === null ? [] : JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return { ok: false, message: "Saved accounts have an invalid format. Your local data has not been changed." };
    }

    const accounts: AccountRecord[] = [];
    const legacyAccounts: LegacyAccountRecord[] = [];
    for (const item of parsed) {
      if (isAccountRecord(item)) accounts.push(item);
      else if (isLegacyAccountRecord(item)) {
        legacyAccounts.push(item);
        accounts.push(migrateLegacyAccount(item));
      } else {
        return { ok: false, message: "One or more saved accounts could not be read. Your local data has not been changed." };
      }
    }

    if (new Set(accounts.map((account) => account.id)).size !== accounts.length) {
      return { ok: false, message: "Saved accounts contain duplicate IDs. Your local data has not been changed." };
    }

    if (legacyAccounts.length) {
      const storedProfile = readPersonalProfile();
      if (!storedProfile.ok) return storedProfile;
      if (!storedProfile.profile) writePersonalProfile(mergeLegacyProfiles(legacyAccounts));
      writeAccounts(accounts);
    }

    return { ok: true, accounts };
  } catch {
    return { ok: false, message: "Account storage could not be read or updated. Your local data has not been changed." };
  }
}

export function writeAccounts(accounts: AccountRecord[]) {
  if (!accounts.every(isAccountRecord) || new Set(accounts.map((account) => account.id)).size !== accounts.length) {
    throw new TypeError("Cannot save invalid account data.");
  }
  window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

export function updateAccountRecord(
  accountId: string,
  update: (account: AccountRecord) => AccountRecord,
) {
  const result = readAccounts();
  if (!result.ok) throw new Error(result.message);
  const account = result.accounts.find((item) => item.id === accountId);
  if (!account) throw new Error("This account is no longer available in this browser.");
  const updatedAccount = update(account);
  const accounts = result.accounts.map((item) => item.id === accountId ? updatedAccount : item);
  writeAccounts(accounts);
  return accounts;
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
