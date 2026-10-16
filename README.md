# VYBE VENTURE

VYBE VENTURE is a prototype personal-finance guidance app that helps users understand their goals, explore account-level planning choices, and review a practical next step with more confidence.

## Product flow

- Landing page positioned around clarity, long-term thinking, and a guided next step.
- Structured onboarding flow: personal details → account goal → planning conversation → review plan.
- Local-first prototype storage for drafts and saved account data in the browser.
- Educational consulting overview to compare scenarios and refine planning assumptions.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

## Key routes

- `/` — landing page
- `/question/register` — personal details questionnaire
- `/account/register` — account goal setup
- `/chat/register` — guided planning conversation
- `/consult` — review and iterate on the plan
- `/dashboard` — account overview, market data, and a live AI global economic brief
- `/welcome` — completion state and reset flow

## Prototype notes

Onboarding and account data are stored in the browser on the current device. This is not a signed-in account system and must be treated as a local prototype. Use sample values rather than real financial data, and avoid using the app on a shared device.

Chat and profile content may be sent to the configured AI service to generate responses and normalize profile information.

## Dashboard economic brief

The dashboard's AI executive brief uses the OpenAI Responses API with live web search to summarize recent global economic developments. Source links are shown with each brief; summaries are cached for 15 minutes, and the refresh action requests a new search. The brief is informational, not financial advice. Market data and news feeds may be delayed or unavailable.

## Onboarding prototype storage

Onboarding is a local prototype, not account registration. Completed details and in-progress drafts are stored in the current browser and are not synced to an account or another device. Browser storage is not secure; use sample values instead of real financial details and avoid shared devices. Chat and profile data are sent to the AI service configured for this project to generate and normalize responses. The onboarding completion page lets you clear the saved browser data.

Saved account records use a versioned prototype schema. Personal details are stored once in `personal_profile`, separately from account-specific goals and planning. Target amounts are USD, and timeframes used by the What If calculator are stored as whole years. Existing version 1 account records are migrated in the browser: personal details are consolidated into the shared profile, and a legacy timeframe is converted only when it is an unambiguous whole number of years. Other free-text timeframe values remain unset rather than being guessed. If saved data is malformed or unavailable, the app reports the problem instead of treating the account list as empty; use the completion page's clear-and-restart action to reset prototype data.

## Investment consulting preview

Open `/consult` to select a locally saved account and review or update its goal, timeframe, target, and planning preferences. The News topic currently uses fictional demo briefs; it is not a live feed. What If compares an early withdrawal with leaving a hypothetical starting balance invested, using fixed -5%, 2%, 5%, and 8% annual return scenarios compounded monthly. The starting balance is an editable example, not a saved account balance. These scenarios are not probabilities; the comparison is illustrative only and excludes fees, taxes, inflation, and additional contributions. Account details and topic conversation history are stored in this browser, while consulting chat context and messages are sent to the configured AI service when you send a message.
