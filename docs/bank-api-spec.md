# Mock Bank API (Prototype)

Minimal bank API for buying and selling investment options, listing them with enough information for a user to decide, showing their current actual value, and serving chart data that the **server calculates and generates**.

All money in this prototype is **USD**, matching the rest of the app.

## Authentication

There is no API key or token. Every request that touches user data identifies the user with a header:

```
X-User-Id: <userId>
```

In this app, `userId` is the five-character user code (`AppUser.token`). The bank creates the user's cash account on first use.

> **Prototype only.** Anyone who knows a user ID can act as that user. The app calls this API from the server only, using the user code it has already verified. The browser never calls the bank directly, and the LLM never chooses the user ID.

Public endpoints (`/v1/products*`, `/v1/areas`) do not need the header.

## Sub-accounts (`accountRef`)

One user has **one cash balance** but can have several planning accounts in the app (`AppAccount`). Orders and holdings carry an optional `accountRef` (the app's `AppAccount.id`) so each planning account can show its own portfolio.

- `POST /v1/orders` accepts `accountRef`.
- `GET /v1/portfolio`, `GET /v1/portfolio/history` and `GET /v1/orders` accept `?accountRef=` to filter. Without it, they cover all of the user's holdings.
- Holdings are keyed by `(userId, accountRef, symbol)`. A sell can only use holdings under the same `accountRef`.

## Base URL

```
/v1
```

The bank is a separate service (the `vybe-venture-bank` project), and the app reaches it through `BANK_API_URL`.

## Endpoints

| Method | Path | Auth header | Purpose |
|---|---|---|---|
| GET | `/v1/account` | yes | Cash balance and account info |
| DELETE | `/v1/account` | yes | Delete the user's cash account, holdings and orders (prototype reset only) |
| GET | `/v1/portfolio` | yes | Holdings valued at current prices, with totals and P/L |
| GET | `/v1/portfolio/history` | yes | Chart series: portfolio value over time |
| GET | `/v1/products` | no | List options with current price and key facts |
| GET | `/v1/products/{symbol}` | no | Full option details for making a decision |
| GET | `/v1/products/{symbol}/history` | no | Chart series: price over time |
| GET | `/v1/areas` | no | List of distinct product areas (for filter UI) |
| POST | `/v1/orders` | yes | Create a buy or sell order |
| GET | `/v1/orders` | yes | List the user's orders |
| GET | `/v1/orders/{orderId}` | yes | Get order status |
| DELETE | `/v1/orders/{orderId}` | yes | Cancel a pending order |

---

## Data model

### Current value

The UI must show two kinds of numbers:

1. **The user's mock data**: cash, holdings, cost basis and order history, all stored in the bank database.
2. **The current actual value of each option**: the latest price of each product in the bank database. Holdings are always valued at this price.

The bank server computes every derived number, so the UI never calculates money itself:

```
marketValue   = quantity × currentPrice
unrealizedPL  = marketValue − (quantity × avgCost)
totalValue    = cashBalance + Σ marketValue
```

Every response that contains a price includes `asOf`, the timestamp of the price used, so the UI can show how fresh it is.

### Chart series format

All history endpoints return the same shape, so one chart component can render any of them. The server calculates and generates the points. The UI only draws them.

```json
{
  "symbol": "NWIX",
  "range": "1M",
  "interval": "1d",
  "currency": "USD",
  "points": [
    { "t": "2026-09-17T00:00:00Z", "v": 251.40 },
    { "t": "2026-09-18T00:00:00Z", "v": 253.10 }
  ],
  "summary": {
    "start": 251.40,
    "end": 260.00,
    "change": 8.60,
    "changePercent": 3.42,
    "high": 261.20,
    "low": 249.90
  }
}
```

| Query param | Values | Default |
|---|---|---|
| `range` | `1D` `1W` `1M` `3M` `1Y` `ALL` | `1M` |

The server picks `interval` from the range (for example `5m` for 1D, `1d` for 1M and longer), so the number of points stays small enough to draw.

---

## Account

### GET `/v1/account`

```json
{
  "userId": "AB12C",
  "currency": "USD",
  "cashBalance": 10000.00,
  "asOf": "2026-10-17T10:00:00Z"
}
```

### DELETE `/v1/account`

Prototype reset only. Deletes the caller's `BankOrder`, `BankHolding` and `BankUser` rows, so the next request starts again with the default cash balance. Returns `204` with no body, also when the user has no data. Product data is never touched.

---

## Portfolio

### GET `/v1/portfolio`

Query: `accountRef` (optional).

Holdings valued at the current price of each option, plus totals. When `accountRef` is given, `cashBalance` is still the user's shared cash. `totals.totalValue` then uses only the filtered holdings plus that shared cash, and `totals.holdingsValue` is the figure to show per planning account.

```json
{
  "currency": "USD",
  "asOf": "2026-10-17T10:00:00Z",
  "accountRef": "8e0f…",
  "cashBalance": 7400.00,
  "holdings": [
    {
      "symbol": "NWIX",
      "name": "Northwind Total Market Fund",
      "area": "Broad market",
      "accountRef": "8e0f…",
      "quantity": 10,
      "avgCost": 245.50,
      "currentPrice": 260.00,
      "marketValue": 2600.00,
      "unrealizedPL": 145.00,
      "unrealizedPLPercent": 5.91,
      "weightPercent": 26.0
    }
  ],
  "totals": {
    "holdingsValue": 2600.00,
    "totalValue": 10000.00,
    "totalCost": 2455.00,
    "unrealizedPL": 145.00,
    "unrealizedPLPercent": 5.91
  }
}
```

`weightPercent` is the holding's share of `totals.holdingsValue`. The UI can use it for an allocation chart without further calculation. Each holding also carries `area`, so the UI can group the portfolio by area.

### GET `/v1/portfolio/history`

Query: `range`, `accountRef` (optional).

Value of the holdings over time. The server replays the user's filled orders against the stored price history to produce the series. Without `accountRef`, the series includes cash, so it shows total value. With `accountRef`, it shows holdings value only.

Response uses the chart series format above, without `symbol`.

---

## Products

A product is a tradable option. The list endpoint returns a compact card for browsing. The detail endpoint returns everything a user needs to decide.

### Product fields

| Field | Type | In list | In detail | Notes |
|---|---|---|---|---|
| `symbol` | string | yes | yes | Unique ID, e.g. `NWIX` |
| `name` | string | yes | yes | |
| `type` | `stock` \| `fund` \| `bond` \| `crypto` | yes | yes | Kind of instrument |
| `area` | string | yes | yes | Free-text topic area, e.g. `Crypto`, `Weapons & defense`, `Education`, `Clean energy`, `Healthcare`, `Broad market` |
| `description` | string | short | full | Plain-language explanation of what the product is and what it invests in |
| `risk` | `low` \| `medium` \| `high` | yes | yes | |
| `currentPrice` | number | yes | yes | Latest actual value |
| `dayChange` / `dayChangePercent` | number | yes | yes | Change since previous close |
| `asOf` | ISO time | yes | yes | Time of `currentPrice` |
| `currency` | string | no | yes | |
| `issuer` | string | no | yes | Company or fund manager |
| `region` | string | no | yes | e.g. `Global`, `US`, `Thailand`, `Emerging markets` |
| `returns` | object | no | yes | `{ "1M": 3.4, "3M": 6.1, "1Y": 14.8, "3Y": 31.2 }` in percent, computed by the server from price history. A period with too little history is `null`. |
| `volatilityPercent` | number | no | yes | Annualised standard deviation of returns, computed by the server |
| `maxDrawdownPercent` | number | no | yes | Worst peak-to-trough fall over the last year |
| `high52w` / `low52w` | number | no | yes | 52-week price range |
| `dividendYieldPercent` | number | no | yes | `0` if none |
| `size` | number | no | yes | Market cap for stocks, assets under management for funds |
| `inceptionDate` | date | no | yes | How long the product has existed |
| `topHoldings` | array | no | yes | For funds: `[{ "name": "Example Co", "weightPercent": 6.1 }]`. Empty for others. |
| `riskNote` | string | no | yes | One or two sentences on the main risks |

`area` is plain text, not a fixed enum, so new areas can be added by inserting products. `GET /v1/areas` returns the distinct values currently in use.

### GET `/v1/products`

Query params (all optional):

| Param | Notes |
|---|---|
| `type` | `stock` \| `fund` \| `bond` \| `crypto` |
| `risk` | `low` \| `medium` \| `high` |
| `area` | Exact match on the `area` text, case-insensitive |
| `q` | Search in `name`, `symbol`, `description` |
| `sort` | `name` (default, A to Z), `price` (low to high), `dayChangePercent` (largest gain first), `risk` (low to high) |

```json
{
  "asOf": "2026-10-17T10:00:00Z",
  "products": [
    {
      "symbol": "NWIX",
      "name": "Northwind Total Market Fund",
      "type": "fund",
      "area": "Broad market",
      "description": "Holds thousands of companies in one fund.",
      "risk": "medium",
      "currentPrice": 260.00,
      "dayChange": 1.20,
      "dayChangePercent": 0.46,
      "asOf": "2026-10-17T10:00:00Z"
    }
  ]
}
```

### GET `/v1/products/{symbol}`

```json
{
  "symbol": "NWIX",
  "name": "Northwind Total Market Fund",
  "type": "fund",
  "area": "Broad market",
  "description": "Holds thousands of companies of every size in a single fund. It follows the overall market instead of trying to beat it, so results track how the wider stock market performs.",
  "risk": "medium",
  "riskNote": "Falls with the market. Drops of 30% or more have happened in past downturns.",
  "currency": "USD",
  "issuer": "Northwind Asset Management",
  "region": "Global",
  "currentPrice": 260.00,
  "dayChange": 1.20,
  "dayChangePercent": 0.46,
  "returns": { "1M": 3.4, "3M": 6.1, "1Y": 14.8, "3Y": null },
  "volatilityPercent": 15.2,
  "maxDrawdownPercent": -18.4,
  "high52w": 268.90,
  "low52w": 221.30,
  "dividendYieldPercent": 1.4,
  "size": 1200000000,
  "inceptionDate": "2011-05-24",
  "topHoldings": [
    { "name": "Example Devices Co", "weightPercent": 6.1 },
    { "name": "Example Software Co", "weightPercent": 5.8 }
  ],
  "asOf": "2026-10-17T10:00:00Z"
}
```

### GET `/v1/products/{symbol}/history`

Price of one option over time. Query: `range`. Response uses the chart series format above.

### GET `/v1/areas`

```json
{
  "areas": [
    { "area": "Broad market", "count": 4 },
    { "area": "Crypto", "count": 3 },
    { "area": "Education", "count": 2 },
    { "area": "Weapons & defense", "count": 2 }
  ]
}
```

---

## Orders

### POST `/v1/orders`

Request:

```json
{
  "symbol": "NWIX",
  "side": "buy",
  "type": "market",
  "quantity": 10,
  "accountRef": "8e0f…",
  "idempotencyKey": "6f1c2f0e-8c1b-4a52-9d57-0d5f2c1e9a11"
}
```

| Field | Type | Notes |
|---|---|---|
| `symbol` | string | Must exist in products |
| `side` | `buy` \| `sell` | |
| `type` | `market` | Only market orders in the prototype |
| `quantity` | number | Use this or `amount`. Must be greater than 0. Fractions allowed (up to 6 decimals). |
| `amount` | number | USD to spend or receive, instead of `quantity`. Must be greater than 0. |
| `accountRef` | string | Optional. The app's planning account ID. |
| `idempotencyKey` | string | Required. Same key from the same user returns the original order instead of creating a duplicate. |

There is no minimum order size and no fee. The order cost is exactly `quantity × currentPrice`. When `amount` is sent, `quantity = amount ÷ currentPrice`, rounded down to 6 decimals, and `total` is `quantity × currentPrice` rounded to cents, so it can be a cent or two below `amount`.

`accountRef` is `null` in responses when the order has no account. Response `201` (or `200` when an existing order is returned for a repeated `idempotencyKey`):

```json
{
  "orderId": "ord_abc123",
  "symbol": "NWIX",
  "side": "buy",
  "status": "filled",
  "accountRef": "8e0f…",
  "quantity": 10,
  "filledPrice": 260.00,
  "filledQuantity": 10,
  "total": 2600.00,
  "createdAt": "2026-10-17T10:00:00Z"
}
```

Market orders fill immediately at the current price, so status is `filled` right away. A filled order updates cash, holdings and `avgCost` in the same database transaction.

### GET `/v1/orders`

Query params (optional): `status`, `accountRef`, `limit` (default 50, max 200). Newest first. Each entry has the same shape as the create response.

```json
{
  "orders": [
    {
      "orderId": "ord_abc123",
      "symbol": "NWIX",
      "side": "buy",
      "status": "filled",
      "accountRef": "8e0f…",
      "quantity": 10,
      "filledPrice": 260.00,
      "filledQuantity": 10,
      "total": 2600.00,
      "createdAt": "2026-10-17T10:00:00Z"
    }
  ]
}
```

### GET `/v1/orders/{orderId}`

Returns the same shape as the create response. Returns `404` if the order does not belong to the caller.

### DELETE `/v1/orders/{orderId}`

Cancels an order that is still `pending`. Returns `409` if it is already filled. All prototype market orders fill at once, so this endpoint exists for the contract and will normally return `409`.

---

## Order status values

`pending` · `filled` · `rejected` · `cancelled`

## Errors

```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Cash balance is lower than the order cost."
  }
}
```

| HTTP | Code | When |
|---|---|---|
| 400 | `INVALID_REQUEST` | Missing or invalid fields, quantity or amount not above 0, or unknown `range` |
| 400 | `INSUFFICIENT_FUNDS` | Buy cost exceeds cash balance |
| 400 | `INSUFFICIENT_HOLDINGS` | Sell quantity exceeds holdings under that `accountRef` |
| 401 | `MISSING_USER_ID` | `X-User-Id` header absent or malformed |
| 404 | `PRODUCT_NOT_FOUND` | Unknown symbol |
| 404 | `ORDER_NOT_FOUND` | Unknown order, or it belongs to another user |
| 409 | `ORDER_NOT_CANCELLABLE` | Order is not `pending` |

---

## Server-side implementation notes

### Tables (bank database)

| Table | Key columns |
|---|---|
| `BankUser` | `userId`, `cashBalance`, `currency`, `createdAt` |
| `BankProduct` | `symbol`, `name`, `type`, `area`, `description`, `risk`, `riskNote`, `currency`, `issuer`, `region`, `currentPrice`, `prevClose`, `dividendYieldPercent`, `size`, `inceptionDate`, `updatedAt` |
| `BankProductHolding` | `symbol`, `holdingName`, `weightPercent` (backs `topHoldings`) |
| `BankPricePoint` | `symbol`, `t`, `price` |
| `BankHolding` | `userId`, `accountRef`, `symbol`, `quantity`, `avgCost` |
| `BankOrder` | `orderId`, `userId`, `accountRef`, `symbol`, `side`, `status`, `quantity`, `filledPrice`, `total`, `idempotencyKey`, `createdAt` |

Indexes: unique `(userId, idempotencyKey)` on orders, unique `(userId, accountRef, symbol)` on holdings, `(symbol, t)` on price points, and `area` on products.

### Derived product fields

Do not store these. Compute them from `BankPricePoint` when the detail endpoint is called (cache for a minute if needed):

- `returns` for each period: `(price now / price then − 1) × 100`
- `volatilityPercent`: standard deviation of daily returns × √252 × 100
- `maxDrawdownPercent`: largest peak-to-trough fall over the last year
- `high52w` / `low52w`: max and min price over the last 52 weeks
- `dayChange` / `dayChangePercent`: from `currentPrice` and `prevClose`

### Where the current price comes from

Prices live in `BankProduct.currentPrice`, and `BankPricePoint` stays in sync with it. The prototype uses a **seeded random walk**. A seed script generates daily history per symbol, and a lazy tick on read appends new points and updates `currentPrice`.

A real feed can replace this later by writing to the same tables. The API does not change.

### Chart generation

- Read `BankPricePoint` for the symbol and range, then downsample to roughly 100–300 points (for example the last value per bucket).
- Compute `summary` (`start`, `end`, `change`, `changePercent`, `high`, `low`) on the server.
- For `/portfolio/history`, for each timestamp compute `Σ(quantity held at t × price at t)` (plus cash when not filtered) by replaying filled orders in time order.
- Return points sorted by `t` ascending. The UI only maps them to chart coordinates.

### Prototype implementation details

- Prices move on a 5-minute grid. A read that returns prices first appends any 5-minute points since the last update (gaps longer than a day are filled with daily points), so `asOf` is at most about 5 minutes old.
- `dayChange` compares `currentPrice` with the last price before 00:00 UTC of the current day.
- `1D` returns 5-minute points, `1W` hourly, and longer ranges daily (`ALL` weekly). When a range would exceed 300 points, the bucket is widened in whole units (for example `1Y` returns `2d` buckets) and `interval` says so.
- `volatilityPercent` and `maxDrawdownPercent` use daily closes of the last 365 days. `volatilityPercent` is `null` with 20 or fewer daily returns.
- A product that is younger than a period has `null` for that return (for example a product launched 16 months ago has `3Y: null`).
- `GET /v1/portfolio` without `accountRef` lists one row per `(accountRef, symbol)`, with `accountRef: null` for unassigned holdings.

## Using the real bank

The real bank is planned at `https://api-vybe.rtreerrtree.com` and is not online yet. The app reaches the bank only through `BANK_API_URL` (the client appends `/v1`), so switching means setting `BANK_API_URL=https://api-vybe.rtreerrtree.com` once it serves this contract.

## Rules

- Always check that the order belongs to the `X-User-Id` caller on `GET` and `DELETE /orders/{orderId}`.
- All money calculations (`marketValue`, `unrealizedPL`, totals, returns, volatility, chart summary) happen on the server. The UI only displays them.
- Fill orders and update cash and holdings in a single database transaction.
- Keep a human confirmation step in the app before calling `POST /v1/orders`. The AI may suggest, but only the user's confirmation sends an order.
- `idempotencyKey` prevents duplicate trades from retries or double clicks.
- Product descriptions and risk notes are informational text for the prototype. They are not personalised financial advice, and the UI says so.
