export type WithdrawalScenarioInput = {
  balance: number;
  withdrawal: number;
  years: number;
};

export type WithdrawalScenarioResult = {
  annualReturn: number;
  withoutWithdrawal: number;
  afterWithdrawal: number;
  futureValueDifference: number;
};

export const WITHDRAWAL_RETURN_ASSUMPTIONS = [-0.05, 0.02, 0.05, 0.08] as const;

const MAX_BALANCE = 100_000_000;
const MAX_YEARS = 50;

export function calculateWithdrawalScenario(
  input: WithdrawalScenarioInput,
): WithdrawalScenarioResult[] {
  const { balance, withdrawal, years } = input;

  if (!Number.isFinite(balance) || balance < 0 || balance > MAX_BALANCE) {
    throw new Error("Enter a balance between $0 and $100,000,000.");
  }
  if (!Number.isFinite(withdrawal) || withdrawal < 0 || withdrawal > balance) {
    throw new Error("The withdrawal must be between $0 and the current balance.");
  }
  if (!Number.isInteger(years) || years < 1 || years > MAX_YEARS) {
    throw new Error("Enter a timeframe between 1 and 50 whole years.");
  }

  const periods = years * 12;

  return WITHDRAWAL_RETURN_ASSUMPTIONS.map((annualReturn) => {
    const monthlyRate = annualReturn / 12;
    const growthFactor = (1 + monthlyRate) ** periods;
    const withoutWithdrawal = balance * growthFactor;
    const afterWithdrawal = (balance - withdrawal) * growthFactor;

    return {
      annualReturn,
      withoutWithdrawal,
      afterWithdrawal,
      futureValueDifference: withoutWithdrawal - afterWithdrawal,
    };
  });
}
