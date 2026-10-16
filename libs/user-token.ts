export const USER_TOKEN_KEY = "vybe_user_token";
export const USER_TOKEN_PATTERN = /^[A-Z0-9]{5}$/;
const TEMPORARY_SETUP_KEYS = ["questionnaire_draft", "questionnaire_register", "account_draft", "account_register", "chat_register_draft", "planning_profile", "onboarding_register"];

export function browserToken() {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(USER_TOKEN_KEY);
  return token && USER_TOKEN_PATTERN.test(token) ? token : null;
}

export function tokenHeaders(): HeadersInit {
  const token = browserToken();
  if (!token) throw new Error("Enter your account code to continue.");
  return { "x-user-token": token };
}

export function setBrowserToken(token: string) {
  if (!USER_TOKEN_PATTERN.test(token)) throw new Error("Invalid account code.");
  const previousToken = window.localStorage.getItem(USER_TOKEN_KEY);
  if (previousToken && previousToken !== token) {
    TEMPORARY_SETUP_KEYS.forEach((key) => window.localStorage.removeItem(key));
  }
  window.localStorage.setItem(USER_TOKEN_KEY, token);
}
