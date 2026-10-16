export type UsdAmount = {
  amount: number;
  currency: "USD";
};

export type PersonalProfile = {
  name: string | null;
  age: number | null;
  gender: string | null;
  investmentExperience: string | null;
  job: string | null;
  income: string | null;
  incomeSources: string | null;
  regularExpenses: string | null;
};

export type AccountPlanning = {
  targetAmount: UsdAmount | null;
  liquidityNeeds: string | null;
  lossReaction: string | null;
  riskAttitude: string | null;
  preferredProducts: string | null;
  excludedIndustries: string | null;
};

// Shortlist entry: a symbol from the bank catalog.
export type SelectedProduct = {
  symbol: string;
  name: string;
};

export type AccountRecord = {
  schemaVersion: 3;
  id: string;
  accountName: string;
  goal: string;
  timeframeYears: number | null;
  planning: AccountPlanning;
  createdAt: string;
  selectedProducts: SelectedProduct[];
};

export type AccountPlanDraft = Pick<AccountRecord, "accountName" | "goal" | "timeframeYears" | "planning">;

// Schema 2 stored AI-generated fictional products. Only the shell is checked: both fields are dropped on upgrade.
export type LegacyV2AccountRecord = Omit<AccountRecord, "schemaVersion" | "selectedProducts"> & {
  schemaVersion: 2;
  selectedProducts: unknown[];
  assetExamples: unknown;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function isUsdAmount(value: unknown): value is UsdAmount {
  return isRecord(value)
    && typeof value.amount === "number"
    && Number.isFinite(value.amount)
    && value.amount >= 0
    && value.amount <= 100_000_000
    && value.currency === "USD";
}

export function isAccountPlanning(value: unknown): value is AccountPlanning {
  return isRecord(value)
    && (value.targetAmount === null || isUsdAmount(value.targetAmount))
    && (value.liquidityNeeds === null || isBoundedString(value.liquidityNeeds, 1_000))
    && (value.lossReaction === null || isBoundedString(value.lossReaction, 1_000))
    && (value.riskAttitude === null || isBoundedString(value.riskAttitude, 1_000))
    && (value.preferredProducts === null || isBoundedString(value.preferredProducts, 1_000))
    && (value.excludedIndustries === null || isBoundedString(value.excludedIndustries, 1_000));
}

export function isAccountPlanDraft(value: unknown): value is AccountPlanDraft {
  return isRecord(value)
    && isBoundedString(value.accountName, 100)
    && value.accountName.trim().length > 0
    && isBoundedString(value.goal, 300)
    && value.goal.trim().length > 0
    && (value.timeframeYears === null
      || (Number.isInteger(value.timeframeYears) && Number(value.timeframeYears) >= 1 && Number(value.timeframeYears) <= 50))
    && isAccountPlanning(value.planning);
}

export function isPersonalProfile(value: unknown): value is PersonalProfile {
  return isRecord(value)
    && (value.name === null || isBoundedString(value.name, 300))
    && (value.age === null || (Number.isInteger(value.age) && Number(value.age) >= 18 && Number(value.age) <= 120))
    && (value.gender === null || isBoundedString(value.gender, 300))
    && (value.investmentExperience === null || isBoundedString(value.investmentExperience, 300))
    && (value.job === null || isBoundedString(value.job, 300))
    && (value.income === null || isBoundedString(value.income, 300))
    && (value.incomeSources === null || isBoundedString(value.incomeSources, 1_000))
    && (value.regularExpenses === null || isBoundedString(value.regularExpenses, 1_000));
}

const PRODUCT_SYMBOL_PATTERN = /^[A-Z0-9.]{1,12}$/;

function isSelectedProduct(value: unknown): value is SelectedProduct {
  return isRecord(value)
    && typeof value.symbol === "string"
    && PRODUCT_SYMBOL_PATTERN.test(value.symbol)
    && isBoundedString(value.name, 150)
    && value.name.length > 0;
}

function isValidTimeframeYears(value: unknown) {
  return value === null || (Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 50);
}

function isAccountBase(value: Record<string, unknown>) {
  return isBoundedString(value.id, 128)
    && value.id.length > 0
    && isBoundedString(value.accountName, 100)
    && value.accountName.trim().length > 0
    && isBoundedString(value.goal, 300)
    && value.goal.trim().length > 0
    && isAccountPlanning(value.planning)
    && typeof value.createdAt === "string"
    && Number.isFinite(Date.parse(value.createdAt))
    && isValidTimeframeYears(value.timeframeYears)
    && Array.isArray(value.selectedProducts)
    && value.selectedProducts.length <= 3;
}

export function isAccountRecord(value: unknown): value is AccountRecord {
  return isRecord(value)
    && value.schemaVersion === 3
    && isAccountBase(value)
    && !("assetExamples" in value)
    && (value.selectedProducts as unknown[]).every(isSelectedProduct)
    && new Set((value.selectedProducts as SelectedProduct[]).map((product) => product.symbol)).size === (value.selectedProducts as unknown[]).length;
}

export function isLegacyV2AccountRecord(value: unknown): value is LegacyV2AccountRecord {
  return isRecord(value)
    && value.schemaVersion === 2
    && isAccountBase(value)
    && (value.selectedProducts as unknown[]).every(isRecord)
    && "assetExamples" in value;
}

// The old selections were AI-generated fictional symbols that do not exist in the bank, so they are dropped.
export function upgradeAccountRecord(record: LegacyV2AccountRecord): AccountRecord {
  const { schemaVersion, assetExamples, selectedProducts, ...rest } = record;
  void schemaVersion; void assetExamples; void selectedProducts;
  return { ...rest, schemaVersion: 3, selectedProducts: [] };
}
