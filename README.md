# VYBE VENTURE

VYBE VENTURE is a prototype personal-finance guidance app that helps users understand their goals, explore account-level planning choices, and review a practical next step with more confidence.

## Product flow

- Landing page positioned around clarity, long-term thinking, and a guided next step.
- Structured onboarding flow: personal details → account goal → planning conversation → review plan.
- Database storage for completed profiles, accounts, product shortlists, and consulting conversations. The browser keeps the account code and temporary setup drafts.
- Educational consulting overview to compare scenarios and refine planning assumptions.

## Getting started

```bash
npm install
npm run db:deploy
npm run db:seed
npm run dev
```

Then open http://localhost:3000 in your browser.

## Key routes

- `/` — landing page
- `/access` — enter an existing five-character account code or generate a new one
- `/question/register` — personal details questionnaire
- `/account/register` — account goal setup
- `/chat/register` — guided planning conversation
- `/consult` — review and iterate on the plan
- `/dashboard` — account overview, market data, and a live AI global economic brief
- `/account/[accountName]/create` — explore the bank's products, filter, shortlist and compare
- `/account/[accountName]/portfolio` — holdings, profit and loss, history chart and orders for one planning account
- `/products/[symbol]` — product details, price chart, key facts, and buy or sell with a confirmation step
- `/welcome` — completion state and reset flow

## Prototype notes

Set `DATABASE_URL` for the PostgreSQL database before running the app. A five-character uppercase alphanumeric code identifies a user; the code is kept in browser local storage and must be entered again on another device. Anyone who knows the code can access its data, so this remains a prototype: use sample values rather than real financial data. There is no password or stronger authentication.

Chat and profile content may be sent to the configured AI service to generate responses and normalize profile information.

## Dashboard economic brief

The dashboard's AI executive brief uses the OpenAI Responses API with live web search to summarize recent global economic developments. Source links are shown with each brief; summaries are cached for 15 minutes, and the refresh action requests a new search. The brief is informational, not financial advice. Market data and news feeds may be delayed or unavailable.

## User data storage

The `AppUser`, `AppAccount`, and `AppConversation` Prisma models persist the completed personal profile, account records (including each account's shortlist of up to three bank product symbols), and consulting chat history. Draft questionnaire, account setup, and planning chat data may remain temporarily in the current browser until the account is completed. Account creation saves the profile and account in one database transaction. The reset controls delete database data and clear drafts.

Saved account records retain a versioned JSON shape in PostgreSQL (schemaVersion 3). Records saved with schemaVersion 2 are upgraded when they are next loaded; their AI-generated example products are dropped because those symbols do not exist in the bank. Personal details are stored once on `AppUser`, separately from account-specific goals and planning. Target amounts are USD, and timeframes used by the What If calculator are stored as whole years. Existing browser-only data is not imported automatically into the database.

## Investment consulting preview

Open `/consult` to select a saved account and review or update its goal, timeframe, target, and planning preferences. The News topic currently uses fictional demo briefs; it is not a live feed. What If compares an early withdrawal with leaving a hypothetical starting balance invested, using fixed -5%, 2%, 5%, and 8% annual return scenarios compounded monthly. The starting balance is an editable example, not a saved account balance. These scenarios are not probabilities; the comparison is illustrative only and excludes fees, taxes, inflation, and additional contributions. Account details and topic conversation history are stored in PostgreSQL, while consulting chat context and messages are sent to the configured AI service when you send a message.

## Mock bank

The product catalog, prices, cash, holdings, and orders come from a mock bank that is served inside this app at `/api/bank/v1` (contract: [`docs/bank-api-spec.md`](docs/bank-api-spec.md)). It has its own `Bank*` tables and knows nothing about the app's users. The app reaches it only from the server, through `/api/invest/*`, which checks the user code and that any `accountRef` belongs to that user before calling the bank with `X-User-Id`. The browser never calls the bank, and no AI route can place orders: an order is sent only when the user presses Confirm in the order dialog.

- `BANK_API_URL` sets where the server finds the bank. For the built-in mock use `http://localhost:3000/api/bank` (the default); the planned real bank at `https://api-vybe.rtreerrtree.com` is not online yet. The client appends `/v1`.
- `npm run db:seed` loads about 18 fictional products with three years of generated price history. It is safe to run again: products are upserted and existing history is kept.
- Prices are simulated with a seeded random walk and move on a 5-minute grid when the bank is read. They are not real market prices.
- Each user code starts with 10,000 USD of play cash, shared by all of that user's planning accounts. Orders and holdings are tagged with the planning account.
- There is no authentication beyond the user code: anyone who knows a code can act as that user. Reset on `/welcome` also deletes the user's bank data.
