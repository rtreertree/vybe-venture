This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Onboarding prototype storage

Onboarding is a local prototype, not account registration. Completed details and in-progress drafts are stored in the current browser and are not synced to an account or another device. Browser storage is not secure; use sample values instead of real financial details and avoid shared devices. Chat and profile data are sent to the AI service configured for this project to generate and normalize responses. The onboarding completion page lets you clear the saved browser data.

Saved account records use a versioned prototype schema. Personal details are stored once in `personal_profile`, separately from account-specific goals and planning. Target amounts are USD, and timeframes used by the What If calculator are stored as whole years. Existing version 1 account records are migrated in the browser: personal details are consolidated into the shared profile, and a legacy timeframe is converted only when it is an unambiguous whole number of years. Other free-text timeframe values remain unset rather than being guessed. If saved data is malformed or unavailable, the app reports the problem instead of treating the account list as empty; use the completion page's clear-and-restart action to reset prototype data.

## Investment consulting preview

Open `/consult` to select a locally saved account and review or update its goal, timeframe, target, and planning preferences. The News topic currently uses fictional demo briefs; it is not a live feed. What If compares an early withdrawal with leaving a hypothetical starting balance invested, using fixed -5%, 2%, 5%, and 8% annual return scenarios compounded monthly. The starting balance is an editable example, not a saved account balance. These scenarios are not probabilities; the comparison is illustrative only and excludes fees, taxes, inflation, and additional contributions. Account details and topic conversation history are stored in this browser, while consulting chat context and messages are sent to the configured AI service when you send a message.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
