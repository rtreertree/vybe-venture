# Agent brief: move product data to the mock bank API

You are implementing a change in **VYBE VENTURE**, a Next.js 16 / React 19 / Prisma 7 (PostgreSQL) prototype for personal-finance guidance. Read this whole brief before you edit anything.

The API contract you must implement and consume is in [`docs/bank-api-spec.md`](./bank-api-spec.md). That file is the source of truth for paths, fields, errors and rules. This brief covers **where** things go in this codebase and **in what order**.

---

## 1. Goal

Today, the investment options a user sees are **fictional cards generated per account by the LLM** (`POST /api/account-assets`), with a hard-coded fallback set. They have no price, no history and cannot be bought.

After this change:

1. A **mock bank** (served inside this app) holds a product catalog with prices, price history, user cash, holdings and orders.
2. The app reads options from the bank instead of generating them, and shows each option's **current value**, details and a **server-generated chart**.
3. Users can **buy and sell** through a confirmation step, then see their **portfolio** (per planning account and in total) with value, P/L and a history chart.
4. The old generated mock product data is removed.

Out of scope: the dashboard's Yahoo market data and news (`/api/market`), the AI economic brief, the consulting News topic's fictional sample briefs, and the onboarding questionnaire and chat flows. Do not change them except where this brief says so.

---

## 2. Know the project first

Read these before you write code:

| File | Why it matters |
|---|---|
| `README.md` | Product flow, routes and prototype caveats |
| `prisma/schema.prisma`, `prisma7.config.ts`, `libs/prisma.ts` | Prisma 7 with the `prisma-client` generator to `generated/prisma`, the `@prisma/adapter-pg` driver adapter and a config file. **Every Prisma CLI call needs `--config prisma7.config.ts`.** |
| `libs/user-token.ts`, `libs/user-data-server.ts` | Identity: a 5-char uppercase code in `localStorage` (`vybe_user_token`), sent as `x-user-token`. `existingUser(request)` validates it server-side, and `sameOrigin(request)` guards writes. |
| `libs/account-model.ts` | `AccountRecord` (schemaVersion 2) and its strict validators. It contains `assetExamples` and `selectedProducts`, the mock data you are replacing. |
| `libs/account-client.ts` | Client helpers: `readAccounts`, `updateAccountRecord`, `accountSlug`. Fires the `account-data-changed` event after writes. |
| `app/api/user-data/route.ts` | Stores `AccountRecord` JSON in `AppAccount.record` and rejects records that fail `isAccountRecord`. |
| `app/api/account-assets/route.ts` | LLM generation of 7 fictional products. **To be deleted.** |
| `app/account/[accountName]/create/page.tsx` | "Explore options" page. It calls `/api/account-assets`, has `createFallbackExamples()`, offers category filters, a details dialog, choose-up-to-3 and a compare table. **To be rebuilt on the bank catalog.** |
| `app/account/[accountName]/page.tsx` | Account overview with the "Saved options" shortlist. |
| `components/account-plan-adjustment.tsx` (≈ line 260) | Resets `assetExamples: null, selectedProducts: []` when the plan changes. |
| `app/chat/register/page.tsx` (≈ line 325) | Creates the first `AccountRecord` with `schemaVersion: 2`, `selectedProducts: []`, `assetExamples: null`. |
| `app/dashboard/page.tsx`, `components/dashboard-components.tsx` | Dashboard sections and `DashboardTrendChart`, an SVG `viewBox 0 0 326 160` that takes path strings. `makeTrendPath` in the dashboard shows how points are mapped to a path. |
| `components/investment-consulting.tsx` | `/consult`. The What If tool has an editable example `balance` (default `"10000"`). |
| `app/globals.css`, `.github/agents/design-ux-ui.agent.md` | Design rules: a six-colour palette as CSS variables and Tailwind tokens (`primary`, `accent`, `light-surface`, `secondary`, `growth`, `risk`, `ink`), Sora for display text and Public Sans for body text, crisp rectangular surfaces, Lucide icons, and required loading, empty and error states. **Follow it for every new page.** |
| `libs/request-json.ts` | `readJsonBody(request, maxBytes)`. Use it for every JSON body. |

Conventions to keep:

- Route handlers are plain `export async function GET/POST(request: Request)` returning `Response` / `Response.json`. In Next 16, dynamic route `params` is a **Promise**: `{ params }: { params: Promise<{ symbol: string }> }` and `const { symbol } = await params`. If unsure about any Next 16 API, check `node_modules/next/dist/docs/` rather than relying on memory.
- Validate every external input with small hand-written type guards (see `account-model.ts`). There is no zod in this project; do not add it.
- Client pages are `"use client"` and fetch from internal `/api/*` routes with `tokenHeaders()`.
- Comment density is low. Match it.

**Working tree warning:** the repo has many uncommitted changes from the user. Do not revert, reformat or commit unrelated files. Do not run `prisma migrate reset` or anything that drops data. Do not commit unless asked.

---

## 3. Architecture

```
Browser ──x-user-token──▶ /api/invest/*  (app BFF, validates the user code)
                              │  server-side fetch, header X-User-Id: <token>
                              ▼
                         /api/bank/v1/*  (mock bank, own Bank* tables)
```

- **Mock bank** at `app/api/bank/v1/**/route.ts`. It implements `docs/bank-api-spec.md` exactly, knows nothing about `AppUser` or `AppAccount`, and trusts `X-User-Id`. Logic lives in `libs/bank/` so route files stay thin.
- **App proxy (BFF)** at `app/api/invest/**/route.ts`. It validates `x-user-token` with `existingUser`, checks `sameOrigin` on writes, checks that any `accountRef` belongs to that user (an `AppAccount` with `userToken = token`), then calls the bank through `libs/bank-client.ts` with `X-User-Id: token`. Pass bank error bodies through unchanged.
- **`libs/bank-client.ts`** (server-only, `import "server-only"` if that package is available, otherwise a comment). It is a typed `fetch` wrapper around `process.env.BANK_API_URL` (e.g. `http://localhost:3000/api/bank`) with a timeout (`AbortSignal.timeout(10_000)`) and `cache: "no-store"`. When the real bank exists, only `BANK_API_URL` changes.
- The browser **never** calls `/api/bank/*` and never sends `X-User-Id`.
- Add `BANK_API_URL` to `.env` (the file is git-ignored, so add the key without a secret) and document it in the README.

Why `accountRef`: the app supports several planning accounts per user code. The bank has one cash balance per user, and holdings and orders are tagged with the planning account ID. See "Sub-accounts" in the spec.

---

## 4. Implementation steps

Do these in order. Each step should leave `npx tsc --noEmit` passing.

### Step 1: Bank schema and migration

In `prisma/schema.prisma`, add the models from the spec's "Tables" section, named `BankUser`, `BankProduct`, `BankProductHolding`, `BankPricePoint`, `BankHolding` and `BankOrder`, with the listed indexes.

- Money and quantity use `Decimal` (`@db.Decimal(18, 2)` for USD, `@db.Decimal(24, 6)` for quantity and price). Convert to `number` only at the response boundary, rounding money to 2 dp.
- `BankHolding.accountRef` and `BankOrder.accountRef` are `String @default("")` (empty means unassigned), so the unique index works without null quirks.
- Keep the existing models untouched.

Create the migration without touching data:

```bash
npx prisma migrate dev --config prisma7.config.ts --name bank_mock
```

If no database is reachable, write the migration with `prisma migrate diff` (see `.agents/skills/prisma-cli/references/migrate-diff.md`) and report that it has not been applied.

### Step 2: Seed the catalog and price history

Create `prisma/seed.ts` and register it in `prisma7.config.ts` under `migrations.seed` (check the Prisma 7 config docs or `.agents/skills/prisma-cli/references/db-seed.md` for the exact key and runner; use `tsx` or `node --experimental-strip-types` as a dev dependency only if required).

Seed requirements:

- **14–18 fictional products** with invented names and symbols (no real tickers or companies; the current app deliberately avoids them). Cover every `type` (`stock`, `fund`, `bond`, `crypto`) and every `risk` level.
- Cover at least these `area` values: `Broad market`, `Technology`, `Healthcare`, `Clean energy`, `Education`, `Weapons & defense`, `Crypto`, `Real estate`, `Government bonds`, `Consumer goods`. At least 2 areas need 2 or more products.
- Every product has full detail fields: `description` (2–4 plain sentences), `riskNote`, `issuer`, `region`, `dividendYieldPercent`, `size` and `inceptionDate`. Funds have 3–5 `BankProductHolding` rows.
- **3 years of daily `BankPricePoint` history** per product from a deterministic seeded random walk (seed from the symbol, so reruns match). Drift and volatility follow risk: bonds and low risk ≈ 3–6% vol, medium ≈ 12–20%, high ≈ 30–45%, crypto ≈ 60–80%. Set `currentPrice` to the last point and `prevClose` to the one before it.
- Idempotent: upsert products and skip history when it already exists.

### Step 3: Bank domain logic (`libs/bank/`)

Split into small modules:

- `libs/bank/prices.ts`
  - `tickPrices(symbols?)`: lazy update. If a product's `updatedAt` is more than 60 s old, append intraday points (5-minute steps, capped at 24 h of catch-up) with the same random walk, then update `currentPrice`. When the UTC day changes, move `prevClose`. Called at the start of any bank read that returns prices.
  - `history(symbol, range)`: reads points for the range, downsamples to ≤ 300 buckets (last value per bucket), and returns the spec's chart series with `summary`. Range-to-interval map: `1D→5m`, `1W→1h`, `1M→1d`, `3M→1d`, `1Y→1d`, `ALL→1w`.
  - `metrics(symbol)`: `returns`, `volatilityPercent`, `maxDrawdownPercent`, `high52w`/`low52w`, using the formulas in the spec. Return `null` for a period without enough history.
- `libs/bank/accounts.ts`: `ensureBankUser(userId)` creates the user with **10,000.00 USD** starting cash on first use.
- `libs/bank/portfolio.ts`: `portfolio(userId, accountRef?)` and `portfolioHistory(userId, range, accountRef?)`, which replays filled orders over price points as described in the spec.
- `libs/bank/orders.ts`: `createOrder(userId, input)` validates input, resolves `amount` to `quantity` (6 dp, round down), and in **one `prisma.$transaction`** checks funds or holdings, writes the order as `filled` at `currentPrice`, updates cash, and upserts the holding with a weighted `avgCost` on buy. On sell, `avgCost` is unchanged, and the holding row is deleted when the quantity reaches 0. A repeated `(userId, idempotencyKey)` returns the existing order with `200`. Catch the unique-constraint error (`P2002`) for races. Also `listOrders`, `getOrder` (ownership check, `404` otherwise) and `cancelOrder` (`409` unless `pending`).
- `libs/bank/http.ts`: `bankError(status, code, message)` producing the spec's error JSON, `requireUserId(request)` (header `X-User-Id` must match `USER_TOKEN_PATTERN`, otherwise `401 MISSING_USER_ID`), and a `parseRange` helper.
- `libs/bank/types.ts`: response types shared with `libs/bank-client.ts` and the UI.

### Step 4: Bank routes (`app/api/bank/v1/...`)

One `route.ts` per path in the spec's endpoint table:

```
app/api/bank/v1/account/route.ts
app/api/bank/v1/portfolio/route.ts
app/api/bank/v1/portfolio/history/route.ts
app/api/bank/v1/products/route.ts
app/api/bank/v1/products/[symbol]/route.ts
app/api/bank/v1/products/[symbol]/history/route.ts
app/api/bank/v1/areas/route.ts
app/api/bank/v1/orders/route.ts          (GET list, POST create)
app/api/bank/v1/orders/[orderId]/route.ts (GET, DELETE)
```

Each route parses input, calls `libs/bank/*` and returns spec-shaped JSON. Product endpoints are public. Everything else uses `requireUserId`. Accept `symbol` case-insensitively and normalise to uppercase.

### Step 5: Client wrapper and app proxy

- `libs/bank-client.ts`: one typed function per bank endpoint (`getProducts(filters)`, `getProduct(symbol)`, `getProductHistory(symbol, range)`, `getAreas()`, `getAccount(userId)`, `getPortfolio(userId, accountRef?)`, `getPortfolioHistory(...)`, `createOrder(userId, body)`, `listOrders(...)`, `getOrder(...)`, `cancelOrder(...)`). Each returns `{ ok: true, data } | { ok: false, status, error }`.
- `app/api/invest/` mirrors the bank paths without `/v1`:
  - `products`, `products/[symbol]`, `products/[symbol]/history` and `areas` are public pass-throughs, cached `s-maxage=30`.
  - `account`, `portfolio`, `portfolio/history`, `orders` and `orders/[orderId]` require `existingUser`. Writes (`POST`/`DELETE`) also require `sameOrigin`. If `accountRef` is present (query or body), verify `prisma.appAccount.findFirst({ where: { id: accountRef, userToken: token } })`, otherwise return `404`.
  - `POST orders`: accept only `symbol`, `side`, `quantity` | `amount`, `accountRef` and `idempotencyKey` from the browser. Rebuild the body (force `type: "market"`) rather than forwarding it as-is. Use `readJsonBody(request, 4_000)`.
- `libs/invest-client.ts` (`"use client"`): browser helpers that call `/api/invest/*` with `tokenHeaders()`, plus `newIdempotencyKey()` using `crypto.randomUUID()`.

### Step 6: Replace mock product data in the account model

In `libs/account-model.ts`:

- Introduce **schemaVersion 3**: drop `assetExamples`. `selectedProducts` becomes `{ symbol: string; name: string }[]` (max 3, symbol `^[A-Z0-9.]{1,12}$`) and is a shortlist of bank symbols. Keep `AssetExample`/`AssetExamples` types only if something still needs them; otherwise delete them.
- `isAccountRecord` accepts v3 only. Add `isLegacyV2AccountRecord` (rename the current v2 checks) and `upgradeAccountRecord(v2) → v3`, which drops `assetExamples` and **drops the old fictional `selectedProducts`**, because their symbols do not exist in the bank.
- `app/api/user-data/route.ts` `GET`: for each stored record, if it is v2, upgrade it, write it back with `updateMany`, and return v3. A record that matches neither version is still a 500.
- Update the creators: `app/chat/register/page.tsx` (`schemaVersion: 3`, `selectedProducts: []`) and `components/account-plan-adjustment.tsx` (stop clearing the shortlist on plan change, since catalog products do not depend on the plan anymore).
- **Delete** `app/api/account-assets/route.ts` and `createFallbackExamples()`. Search for `account-assets`, `assetExamples`, `AssetExample` and `examplesId` afterwards: there should be no remaining references.

### Step 7: Shared UI pieces

Put these in `components/invest/`:

- `price-chart.tsx`: takes a chart series (spec format) and renders an accessible SVG line. It maps `points` to coordinates only, using the same approach as `makeTrendPath`. Includes a range switcher (`1D 1W 1M 3M 1Y ALL`) that refetches `.../history?range=`, the `summary` change shown in growth (up) or risk (down), loading skeleton, empty state ("Not enough history yet") and error state. Colours come from CSS variables only.
- `product-card.tsx`: name, symbol, `type` chip, `area` chip, short description, risk, `currentPrice`, `dayChangePercent` (with sign and colour) and an "as of" time.
- `order-dialog.tsx`: the **confirmation step**. Step 1: pick buy or sell, then quantity **or** USD amount, with a shared numeric input that rejects ≤ 0 and NaN. It shows the estimated total from the displayed price, cash available (buy) or quantity held in this account (sell), plus a line saying the price can move before the order fills. Step 2: a review screen ("You are about to buy 3.5 NWIX for about $910.00 from {accountName}") with **Confirm** and **Back**. Only Confirm calls `POST /api/invest/orders`, with one idempotency key generated when the dialog opens and reused on retry. It disables Confirm while submitting, maps error codes to plain messages (`INSUFFICIENT_FUNDS` → "You don't have enough cash for this order."), shows the filled price and total on success, and dispatches a `portfolio-changed` window event.
- `money.ts`: `formatUsd`, `formatPercent` (signed) and `formatQuantity`. Reuse rather than redefining per page (`app/account/[accountName]/page.tsx` and the dashboard each have their own `formatUsd` today; switch them over while you are there).

Follow the design agent rules: `min-h-11` touch targets, visible focus (`focus-visible:outline-accent`), a `role="dialog"` with `aria-modal`, Escape to close, focus returned to the trigger, `role="alert"` for errors, `role="status"` for success, and layouts that work at 375 px.

### Step 8: Pages

#### 8a. Explore options: `app/account/[accountName]/create/page.tsx` (rewrite)

Keep the route, header, hero and "Back to your plan" / `AccountPlanAdjustment` behaviour. Replace the data source:

- Load `GET /api/invest/products` and `GET /api/invest/areas`.
- Filters: area chips (from `/areas`, plus "All"), type and risk selects, and a search box (`q`, debounced 300 ms). Filters go into the URL query so a link reproduces the view.
- **Excluded industries:** if `account.planning.excludedIndustries` is set, split it on commas or "and", and mark products whose `area` contains any term (case-insensitive) with an "Outside your preferences" note. Sort them last. Do not hide them silently.
- Grid of `product-card`. Each card has **Details** (link to the product page with `?account=<id>`) and **Shortlist** (toggle, max 3, same "replace oldest" behaviour as today).
- The compare table shows the shortlisted products side by side: price, day change, risk, area, type, 1Y return, volatility, max drawdown and dividend yield (fetch details for those symbols). "Save shortlist" writes `selectedProducts` with `updateAccountRecord`.
- Replace the "AI-generated, fictional examples" copy with: "Simulated prices from a prototype bank. For learning and comparison, not recommendations."
- Remove the "Refresh examples" button.

#### 8b. Product detail (new): `app/products/[symbol]/page.tsx`

- Reads `?account=<id>` to know which planning account a trade belongs to. If none is given, it shows an account picker from `readAccounts()` before allowing a trade.
- Hero: name, symbol, type and area chips, `currentPrice`, day change and "as of".
- `price-chart` fed by `/api/invest/products/{symbol}/history`, default `1Y`.
- "About" section: the full `description`, issuer, region and inception date.
- "Key facts" grid: returns (1M, 3M, 1Y, 3Y, with "—" for null), volatility, max drawdown, 52-week range, dividend yield and size (compact format).
- "Risks" section: `risk` level and `riskNote`.
- "Top holdings" table (funds only).
- "Your position" (when an account is selected): from `/api/invest/portfolio?accountRef=`, shows quantity, avg cost, market value and P/L for this symbol, or "You don't own this yet."
- **Buy** and **Sell** buttons open `order-dialog`. Sell is disabled when nothing is held.
- Footer disclaimer as on other pages.

#### 8c. Account portfolio (new): `app/account/[accountName]/portfolio/page.tsx`

Resolve the account from the slug the same way the overview page does, then:

- Summary tiles: holdings value, unrealised P/L (amount and %), and **shared cash available** (labelled as shared across all accounts).
- `price-chart` fed by `/api/invest/portfolio/history?accountRef=`, default `3M`.
- Allocation by `area`, using `weightPercent`. Either simple horizontal bars or reuse the `DashboardHeatmap` style; no chart library.
- Holdings table: symbol, name, area, quantity, avg cost, current price, market value, P/L and weight. Each row links to the product page and has a quick Sell action (opens `order-dialog`).
- Order history from `/api/invest/orders?accountRef=`: date, side, symbol, quantity, filled price, total and status. The Cancel button only appears for `pending`.
- Empty state: "No investments in this account yet", linking to Explore options.
- Refetch on the `portfolio-changed` event.

#### 8d. Account overview: `app/account/[accountName]/page.tsx` (update)

- Add a **Portfolio** link in the "Account pages" nav next to Explore options.
- In the "Your plan at a glance" aside, add the current holdings value. If `targetAmount` is set, also add progress toward the target (`holdingsValue / target`, with the bank doing the value maths and the page only computing that ratio for a progress bar).
- "Saved options" now lists the shortlist with live `currentPrice` and `dayChangePercent` (one `GET /api/invest/products` call, filtered client-side by symbol). Each item links to the product page.

#### 8e. Dashboard: `app/dashboard/page.tsx` (update, small)

- Above or inside "Your accounts", add a total line: total value, cash and unrealised P/L from `/api/invest/portfolio` (no `accountRef`).
- Each account card shows that account's holdings value (`holdingsValue` per `accountRef`; fetch in parallel, limited to the listed accounts).
- Leave the market snapshot, Yahoo news and economic brief unchanged.

#### 8f. Consulting What If: `components/investment-consulting.tsx` (update, small)

- When an account is selected, prefill `balance` with that account's `holdingsValue` (rounded to whole dollars) if it is above 0, with a note: "Prefilled from this account's current holdings value. You can change it." It must remain editable and the calculator must stay unchanged.

### Step 9: Reset flow

`components/reset-user-data-button.tsx` and `DELETE /api/user-data` / `DELETE /api/identity` remove app data. They must also remove that user's bank data, by calling a bank-side delete. Add `DELETE /api/bank/v1/account` (not in the original spec; add it to `docs/bank-api-spec.md` with the note "prototype reset only"). It deletes `BankOrder`, `BankHolding` and `BankUser` for `X-User-Id`. Call it from both delete handlers after the app data is removed.

### Step 10: Docs

- `README.md`: add `/products/[symbol]` and `/account/[accountName]/portfolio` to **Key routes**, add a "Mock bank" section (what it is, `BANK_API_URL`, seed command, simulated prices, 10,000 USD starting cash, no auth beyond the user code), update "User data storage" for schemaVersion 3, and remove the text about AI-generated asset examples.
- Keep `docs/bank-api-spec.md` in sync with anything you had to change.

---

## 5. Rules you must not break

- The bank and the app proxy do all money and metric calculations. The UI only formats and maps chart points.
- No order is created without the user pressing **Confirm** in `order-dialog`. The LLM chat routes must **not** get a tool or code path that places orders.
- The browser never calls `/api/bank/*`, never sends `X-User-Id`, and cannot choose another user. The proxy always derives the user from a validated `x-user-token`.
- An `accountRef` from the browser is always checked against the caller's `AppAccount` rows.
- Orders, cash and holdings change in one transaction. `idempotencyKey` is required and unique per user.
- Keep the existing palette, fonts and component style. Add no chart or UI libraries.
- Every new page has loading, empty and error states and a "not financial advice" footer.

---

## 6. Verification

Run all of these and report the actual results. If something cannot be run (for example no database), say so.

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

```bash
npm run build
```

With a database available, run the seed and `npm run dev`, then check:

1. `GET /api/bank/v1/products` returns the seeded products with `currentPrice` and `asOf`. `?area=crypto` filters, and `/v1/areas` lists counts.
2. `GET /api/bank/v1/products/{symbol}/history?range=1Y` returns ≤ 300 ascending points and a correct `summary`. `range=bad` returns `400 INVALID_REQUEST`.
3. Without `X-User-Id`, `/v1/portfolio` returns `401 MISSING_USER_ID`.
4. A buy with insufficient cash returns `400 INSUFFICIENT_FUNDS`. Selling more than held returns `400 INSUFFICIENT_HOLDINGS`.
5. The same `idempotencyKey` sent twice creates **one** order (second response is `200` with the same `orderId`), and cash is debited once.
6. `GET /v1/orders/{id}` with a different `X-User-Id` returns `404`.
7. `/api/invest/portfolio?accountRef=<someone else's account id>` returns `404`.
8. In the browser: generate a code, finish onboarding, open Explore options, filter by area, shortlist and save, open a product, buy with Confirm, see the position, open Portfolio and see the holding, P/L, chart and order, then sell part of it and see cash and quantity update.
9. An existing v2 account record loads without error and is upgraded to v3 in the database.
10. Reset on `/welcome` removes the user's bank holdings and orders too.
11. Check pages at 375 px and in a desktop width, and tab through the order dialog with the keyboard.

---

## 7. Hand-back report

When done, report:

- Files added, changed and deleted, grouped by step.
- Migration name and whether it was applied. Seed status.
- Output of the three verification commands, and which manual checks you ran and which you could not.
- Any change you made to `docs/bank-api-spec.md`, and anything in this brief you deviated from, with the reason.
