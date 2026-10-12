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

export type AssetExample = {
  id: string;
  name: string;
  symbol: string;
  category: string;
  risk: string;
  time_horizon: string;
  liquidity: string;
  cost: string;
  why_it_may_fit: string;
  what_to_watch: string;
  summary: string;
};

export type AssetExamples = {
  id: string;
  createdAt: string;
  headline: string;
  summary: string;
  assets: AssetExample[];
};

export type SelectedProduct = Pick<AssetExample, "id" | "name" | "symbol"> & {
  examplesId: string;
};

export type AccountRecord = {
  schemaVersion: 2;
  id: string;
  accountName: string;
  goal: string;
  timeframeYears: number | null;
  planning: AccountPlanning;
  createdAt: string;
  selectedProducts: SelectedProduct[];
  assetExamples: AssetExamples | null;
};

export type LegacyAccountRecord = {
  schemaVersion: 1;
  id: string;
  accountName: string;
  goal: string;
  timeframe: string | null;
  planning: AccountPlanning;
  personal: PersonalProfile;
  createdAt: string;
  selectedProducts: SelectedProduct[];
  assetExamples: AssetExamples | null;
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

function isLegacyPersonalProfile(value: unknown): value is PersonalProfile {
  return isRecord(value)
    && (value.name === null || isBoundedString(value.name, 300))
    && (value.age === null || (Number.isInteger(value.age) && Number(value.age) >= 1 && Number(value.age) <= 120))
    && (value.gender === null || isBoundedString(value.gender, 300))
    && (value.investmentExperience === null || isBoundedString(value.investmentExperience, 300))
    && (value.job === null || isBoundedString(value.job, 300))
    && (value.income === null || isBoundedString(value.income, 300))
    && (value.incomeSources === null || isBoundedString(value.incomeSources, 1_000))
    && (value.regularExpenses === null || isBoundedString(value.regularExpenses, 1_000));
}

function isAssetExample(value: unknown): value is AssetExample {
  return isRecord(value)
    && isBoundedString(value.id, 64)
    && isBoundedString(value.name, 150)
    && isBoundedString(value.symbol, 32)
    && isBoundedString(value.category, 100)
    && isBoundedString(value.risk, 100)
    && isBoundedString(value.time_horizon, 100)
    && isBoundedString(value.liquidity, 100)
    && isBoundedString(value.cost, 100)
    && isBoundedString(value.why_it_may_fit, 500)
    && isBoundedString(value.what_to_watch, 500)
    && isBoundedString(value.summary, 500);
}

function isAssetExamplesContent(value: unknown): value is Omit<AssetExamples, "id" | "createdAt"> {
  return isRecord(value)
    && isBoundedString(value.headline, 300)
    && isBoundedString(value.summary, 1_000)
    && Array.isArray(value.assets)
    && value.assets.length === 4
    && value.assets.every(isAssetExample)
    && new Set(value.assets.map((asset) => asset.id)).size === value.assets.length;
}

export function isAssetExamples(value: unknown): value is AssetExamples {
  return isRecord(value)
    && isBoundedString(value.id, 256)
    && value.id.length > 0
    && typeof value.createdAt === "string"
    && Number.isFinite(Date.parse(value.createdAt))
    && isAssetExamplesContent(value);
}

function isLegacyAssetExamples(value: unknown): value is Omit<AssetExamples, "id" | "createdAt"> {
  return isAssetExamplesContent(value);
}

function isSelectedProduct(value: unknown): value is SelectedProduct {
  return isRecord(value)
    && isBoundedString(value.id, 64)
    && isBoundedString(value.name, 150)
    && isBoundedString(value.symbol, 32)
    && isBoundedString(value.examplesId, 256)
    && value.examplesId.length > 0;
}

function isLegacySelectedProduct(value: unknown): value is Omit<SelectedProduct, "examplesId"> {
  return isRecord(value)
    && isBoundedString(value.id, 64)
    && isBoundedString(value.name, 150)
    && isBoundedString(value.symbol, 32);
}

function isAccountBase(
  value: Record<string, unknown>,
  assetExamplesValidator: (value: unknown) => boolean,
  selectedProductValidator: (value: unknown) => boolean,
) {
  return isBoundedString(value.id, 128)
    && value.id.length > 0
    && isBoundedString(value.accountName, 100)
    && value.accountName.trim().length > 0
    && isBoundedString(value.goal, 300)
    && value.goal.trim().length > 0
    && isAccountPlanning(value.planning)
    && typeof value.createdAt === "string"
    && Number.isFinite(Date.parse(value.createdAt))
    && Array.isArray(value.selectedProducts)
    && value.selectedProducts.length <= 2
    && value.selectedProducts.every(selectedProductValidator)
    && (value.assetExamples === null || assetExamplesValidator(value.assetExamples));
}

function hasValidProductSelections(value: Record<string, unknown>) {
  if (!Array.isArray(value.selectedProducts)) return false;
  if (value.assetExamples === null) return value.selectedProducts.length === 0;
  const examples = value.assetExamples;
  if (!isRecord(examples)) return false;
  const assets = examples.assets;
  if (!Array.isArray(assets)) return false;

  return value.selectedProducts.every((product) => {
    if (!isSelectedProduct(product) || product.examplesId !== examples.id) return false;
    const asset = assets.find((candidate) => isRecord(candidate) && candidate.id === product.id);
    return isRecord(asset) && asset.name === product.name && asset.symbol === product.symbol;
  });
}

export function isAccountRecord(value: unknown): value is AccountRecord {
  return isRecord(value)
    && value.schemaVersion === 2
    && isAccountBase(value, isAssetExamples, isSelectedProduct)
    && (value.timeframeYears === null
      || (Number.isInteger(value.timeframeYears) && Number(value.timeframeYears) >= 1 && Number(value.timeframeYears) <= 50))
    && hasValidProductSelections(value);
}

export function isLegacyAccountRecord(value: unknown): value is LegacyAccountRecord {
  return isRecord(value)
    && value.schemaVersion === 1
    && isAccountBase(value, isLegacyAssetExamples, isLegacySelectedProduct)
    && (value.timeframe === null || isBoundedString(value.timeframe, 100))
    && isLegacyPersonalProfile(value.personal);
}
