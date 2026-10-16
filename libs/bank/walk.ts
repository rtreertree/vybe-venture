// Deterministic random walk shared by the seed script and the lazy price tick.
export const DAY_MS = 86_400_000;
export const HOUR_MS = 3_600_000;
export const FIVE_MIN_MS = 300_000;

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededRandom(seed: string) {
  let state = hashString(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(random: () => number) {
  const u = Math.max(random(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
}

export type WalkProfile = { drift: number; volatility: number };

// `fraction` is the part of a day one step covers. Daily steps use sigma/sqrt(252) so the
// annualised volatility computed from daily closes matches the profile.
export function stepFactor(profile: WalkProfile, fraction: number, random: () => number) {
  const dailySigma = profile.volatility / Math.sqrt(252);
  return Math.exp((profile.drift / 365 - 0.5 * dailySigma ** 2) * fraction + dailySigma * Math.sqrt(fraction) * gaussian(random));
}

export function nextPrice(price: number, profile: WalkProfile, fraction: number, random: () => number) {
  return Math.max(0.01, Math.round(price * stepFactor(profile, fraction, random) * 100) / 100);
}

export function stepAt(symbol: string, t: number) {
  return seededRandom(`${symbol}:${t}`);
}

export function profileFor(product: { symbol: string; type: string; risk: string }): WalkProfile {
  const u = seededRandom(`profile:${product.symbol}`)();
  const between = (low: number, high: number) => low + u * (high - low);
  if (product.type === "crypto") return { drift: between(0.1, 0.2), volatility: between(0.6, 0.8) };
  if (product.type === "bond") return { drift: between(0.03, 0.045), volatility: between(0.03, 0.06) };
  if (product.risk === "low") return { drift: between(0.035, 0.05), volatility: between(0.04, 0.06) };
  if (product.risk === "medium") return { drift: between(0.06, 0.09), volatility: between(0.12, 0.2) };
  return { drift: between(0.08, 0.14), volatility: between(0.3, 0.45) };
}
