# VYBE VENTURE

VYBE VENTURE is a prototype personal-finance guidance app that helps users understand their goals, explore account-level planning choices, and review a practical next step with more confidence.

## Product flow

- Landing page positioned around clarity, long-term thinking, and a guided next step.
- Structured onboarding flow: personal details → account goal → planning conversation → review plan.
- Database storage for completed profiles, accounts, asset choices, and consulting conversations. The browser keeps the account code and temporary setup drafts.
- Educational consulting overview to compare scenarios and refine planning assumptions.

## Getting started

```bash
npm install
npm run db:deploy
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
- `/welcome` — completion state and reset flow

## Prototype notes

Set `DATABASE_URL` for the PostgreSQL database before running the app. A five-character uppercase alphanumeric code identifies a user; the code is kept in browser local storage and must be entered again on another device. Anyone who knows the code can access its data, so this remains a prototype: use sample values rather than real financial data. There is no password or stronger authentication.

Chat and profile content may be sent to the configured AI service to generate responses and normalize profile information.

## Dashboard economic brief

The dashboard's AI executive brief uses the OpenAI Responses API with live web search to summarize recent global economic developments. Source links are shown with each brief; summaries are cached for 15 minutes, and the refresh action requests a new search. The brief is informational, not financial advice. Market data and news feeds may be delayed or unavailable.

## User data storage

The `AppUser`, `AppAccount`, and `AppConversation` Prisma models persist the completed personal profile, account records, asset examples and selections, and consulting chat history. Draft questionnaire, account setup, and planning chat data may remain temporarily in the current browser until the account is completed. Account creation saves the profile and account in one database transaction. The reset controls delete database data and clear drafts.

Saved account records retain a versioned JSON shape in PostgreSQL. Personal details are stored once on `AppUser`, separately from account-specific goals and planning. Target amounts are USD, and timeframes used by the What If calculator are stored as whole years. Existing browser-only data is not imported automatically into the database.

## Investment consulting preview

Open `/consult` to select a saved account and review or update its goal, timeframe, target, and planning preferences. The News topic currently uses fictional demo briefs; it is not a live feed. What If compares an early withdrawal with leaving a hypothetical starting balance invested, using fixed -5%, 2%, 5%, and 8% annual return scenarios compounded monthly. The starting balance is an editable example, not a saved account balance. These scenarios are not probabilities; the comparison is illustrative only and excludes fees, taxes, inflation, and additional contributions. Account details and topic conversation history are stored in PostgreSQL, while consulting chat context and messages are sent to the configured AI service when you send a message.
