"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Sparkles } from "lucide-react";


type QuestionnaireAnswers = {
  fullName: string;
  age: number;
  gender: string;
  investmentExperience: string;
  incomeAmount: number;
};
type Choice = {
  label: string;
  description: string;
};

type Question = {
  id: keyof QuestionnaireAnswers;
  eyebrow: string;
  title: string;
  description: string;
  choices?: Choice[];
  input?: {
    type: "text" | "number" | "date";
    label: string;
    placeholder?: string;
    suffix?: string;
    autoComplete?: string;
    min?: number;
    max?: number;
  };
};


const questions: Question[] = [
  {
    id: "fullName",
    eyebrow: "A quick introduction",
    title: "What is your full name?",
    description: "Enter your full name so we can personalize your financial setup.",
    input: {
      type: "text",
      label: "Full name",
      placeholder: "Enter your full name",
      autoComplete: "name",
    },
  },
  {
    id: "age",
    eyebrow: "About you",
    title: "How old are you?",
    description: "Your age helps us understand your financial stage and planning needs.",
    input: {
      type: "number",
      label: "Age",
      placeholder: "Enter your age",
      min: 18,
      max: 120,
    },
  },
  {
    id: "gender",
    eyebrow: "About you",
    title: "How do you identify?",
    description: "This information is optional and helps us better understand your preferences.",
    choices: [
      { label: "Male", description: "" },
      { label: "Female", description: "" },
      { label: "Prefer not to say", description: "" },
    ],
  },
  {
    id: "investmentExperience",
    eyebrow: "Your financial background",
    title: "How much investing experience do you have?",
    description: "This helps us tailor the experience to your familiarity with investing.",
    choices: [
      {
        label: "Beginner",
        description: "I have little or no experience investing.",
      },
      {
        label: "Some experience",
        description: "I have invested before and understand the basics.",
      },
      {
        label: "Experienced",
        description: "I regularly invest and understand different investment options.",
      },
      {
        label: "Advanced",
        description: "I have substantial investing experience and knowledge.",
      },
    ],
  },
  {
    id: "incomeAmount",
    eyebrow: "Your income",
    title: "What is your annual income?",
    description: "An estimate is fine. This helps us understand your financial situation and plan realistically.",
    input: {
      type: "number",
      label: "Annual income",
      placeholder: "Enter your income",
      suffix: "USD",
      min: 0,
    },
  },
];

const emptyAnswers = () => questions.map(() => "");
const draftKey = "questionnaire_draft";

function answersFromCompletedRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  return questions.map((question) => {
    const answer = record[question.id];
    if (question.choices) {
      if (typeof answer !== "string") return "";
      const choiceIndex = question.choices.findIndex((choice) => choice.label === answer);
      return choiceIndex < 0 ? "" : String(choiceIndex);
    }
    if (question.input?.type === "number") {
      if (typeof answer !== "number" && typeof answer !== "string") return "";
      if (typeof answer === "string" && !answer.trim()) return "";
      const number = typeof answer === "number" ? answer : Number(answer);
      return Number.isFinite(number) ? String(number) : "";
    }
    return typeof answer === "string" ? answer : "";
  });
}

function isCompleteAnswerSet(answers: string[]) {
  return questions.every((question, index) => {
    const answer = answers[index]?.trim() ?? "";
    if (!answer) return false;
    if (question.choices) {
      const choiceIndex = Number(answer);
      return Number.isInteger(choiceIndex) && Boolean(question.choices?.[choiceIndex]);
    }
    if (question.input?.type === "number") {
      const number = Number(answer);
      return Number.isFinite(number)
        && number >= (question.input.min ?? Number.NEGATIVE_INFINITY)
        && number <= (question.input.max ?? Number.POSITIVE_INFINITY)
        && (question.id !== "age" || Number.isInteger(number));
    }
    return true;
  });
}


function StepProgress({ current }: { current: number }) {
  return (
    <div className="border-b border-primary/10 pb-5 sm:pb-6">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-secondary">
        <span>Getting to know you</span>
        <span>Step {current + 1} of {questions.length}</span>
      </div>
      <div className="mt-3 flex gap-2" aria-label={`Question ${current + 1} of ${questions.length}`}>
        {questions.map((question, index) => (
          <span key={question.title} className={`h-1.5 flex-1 ${index <= current ? "bg-accent" : "bg-primary/10"}`} />
        ))}
      </div>
    </div>
  );
}

export function QuestionnaireForm() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(emptyAnswers);
  const [isComplete, setIsComplete] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const [showRequired, setShowRequired] = useState(false);
  const [saveError, setSaveError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const restore = () => {
      try {
        const savedDraft = window.localStorage.getItem(draftKey);
        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft) as {
              step?: unknown;
              answers?: unknown;
              complete?: unknown;
            };
            if (
              Number.isInteger(draft.step)
              && (draft.step as number) >= 0
              && (draft.step as number) < questions.length
              && Array.isArray(draft.answers)
              && draft.answers.length === questions.length
              && draft.answers.every((answer) => typeof answer === "string")
            ) {
              const restoredAnswers = draft.answers as string[];
              setStep(draft.step as number);
              setAnswers(restoredAnswers);
              setIsComplete(draft.complete === true && isCompleteAnswerSet(restoredAnswers));
              setIsRestored(true);
              return;
            }
          } catch {
          }
        }

        const savedRegister = window.localStorage.getItem("questionnaire_register");
        if (savedRegister) {
          try {
            const restoredAnswers = answersFromCompletedRecord(JSON.parse(savedRegister));
            if (restoredAnswers) {
              setAnswers(restoredAnswers);
              setIsComplete(isCompleteAnswerSet(restoredAnswers));
            }
          } catch {
          }
        }
      } catch {
      } finally {
        setIsRestored(true);
      }
    };
    const restoreTimeout = window.setTimeout(restore, 0);
    return () => window.clearTimeout(restoreTimeout);
  }, []);

  const persistDraft = (nextStep: number, nextAnswers: string[], complete = false) => {
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({
        step: nextStep,
        answers: nextAnswers,
        complete,
      }));
      setSaveError("");
      return true;
    } catch {
      setSaveError("We couldn't save your answers on this device. Please try again.");
      return false;
    }
  };

  const question = questions[step];
  const answer = answers[step];

  const validateResponse = (value: string) => {
    const trimmedValue = value.trim();

    if (!trimmedValue) return "Please choose or enter an answer to continue.";

    if (question.input?.type === "number") {
      const numericValue = Number(trimmedValue);

      if (!Number.isFinite(numericValue)) {
        return question.id === "age"
          ? "Please enter a valid age in years."
          : "Please enter a valid income amount.";
      }

      if (question.input.min !== undefined && numericValue < question.input.min) {
        return question.id === "age"
          ? "You must be at least 18 to continue."
          : "Income must be $0 or more.";
      }

      if (question.input.max !== undefined && numericValue > question.input.max) {
        return question.id === "age"
          ? "Please enter an age of 120 or younger."
          : "Please enter an amount within the allowed range.";
      }

      if (question.id === "age" && !Number.isInteger(numericValue)) {
        return "Age should be entered as a whole number.";
      }
    }

    return "";
  };

  const choose = (index: number) => {
    const updatedAnswers = answers.map((currentAnswer, answerIndex) => answerIndex === step ? String(index) : currentAnswer);
    setAnswers(updatedAnswers);
    persistDraft(step, updatedAnswers);
    setShowRequired(false);
  };

  const updateAnswer = (value: string) => {
    const updatedAnswers = answers.map((currentAnswer, answerIndex) => answerIndex === step ? value : currentAnswer);
    setAnswers(updatedAnswers);
    const saved = persistDraft(step, updatedAnswers);
    if (value.trim() && saved) {
      setShowRequired(false);
    }
  };

  const next = () => {
    const response = question.input ? inputRef.current?.value.trim() ?? answer.trim() : answer.trim();
    const validationMessage = validateResponse(response);

    if (validationMessage) {
      setShowRequired(true);
      setSaveError(validationMessage);
      return;
    }

    const updatedAnswers = answers.map((currentAnswer, answerIndex) => answerIndex === step ? response : currentAnswer);
    if (step === questions.length - 1) {
      const payload = Object.fromEntries(questions.map((item, index) => {
        const value = updatedAnswers[index];

        if (item.choices) {
          return [item.id, item.choices[Number(value)]?.label ?? ""];
        }

        if (item.input?.type === "number") {
          return [item.id, Number(value)];
        }

        return [item.id, value];
      })) as QuestionnaireAnswers;

      try {
        window.localStorage.setItem("questionnaire_register", JSON.stringify(payload));
        setAnswers(updatedAnswers);
        if (persistDraft(step, updatedAnswers, true)) {
          setIsComplete(true);
        }
      } catch {
        setSaveError("We couldn't save your answers on this device. Please try again.");
      }
      return;
    }
    setAnswers(updatedAnswers);
    setShowRequired(false);
    const nextStep = step + 1;
    persistDraft(nextStep, updatedAnswers);
    setStep(nextStep);
  };

  if (!isRestored) {
    return (
      <section className="flex flex-1 items-center justify-center bg-white px-6 py-12 sm:border-x sm:border-primary/10" aria-busy="true">
        <p role="status" className="text-sm text-secondary">Restoring your saved answers…</p>
      </section>
    );
  }

  if (isComplete) {
    return (
      <section className="flex flex-1 flex-col bg-white sm:border-x sm:border-primary/10" aria-live="polite">
        <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-10">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-growth/15 text-growth"><Check className="h-6 w-6" aria-hidden /></span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.12em] text-secondary">Personal details complete</p>
          <h1 className="mt-3 max-w-xl font-display text-3xl font-bold leading-tight text-primary sm:text-4xl">One more step, then we&apos;ll talk.</h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-ink/70">Give this account a name and tell us what it&apos;s for. Your details will carry through, so the conversation starts with the full picture.</p>

          <Link href="/account/register" className="mt-8 inline-flex min-h-12 w-full max-w-lg items-center justify-center gap-3 bg-accent px-6 font-semibold text-primary transition-colors hover:bg-accent/90 sm:w-auto">
            Add account details <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
          <button onClick={() => { setStep(0); setIsComplete(false); setShowRequired(false); persistDraft(0, answers); }} className="mt-4 inline-flex min-h-11 self-start items-center gap-2 px-1 text-sm font-semibold text-secondary transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <Sparkles className="h-4 w-4" aria-hidden /> Edit my answers
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col bg-white sm:border-x sm:border-primary/10">
      <div className="flex-1 px-6 py-6 sm:px-10 sm:py-8">
        <StepProgress current={step} />
        <div className="pt-8 sm:pt-10">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">{question.eyebrow}</p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold leading-tight text-primary sm:text-4xl">{question.title}</h1>
          <p id="question-help" className="mt-4 max-w-2xl text-sm leading-6 text-ink/70 sm:text-base sm:leading-7">{question.description}</p>

          {question.choices ? (
            <div className="mt-8 space-y-3 pb-4" role="radiogroup" aria-describedby="question-help" aria-label={question.title}>
              {question.choices.map((choice, index) => {
                const active = answer === String(index);
                return (
                  <button
                    key={choice.label}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => choose(index)}
                    className={`group flex w-full items-start gap-4 border p-4 text-left transition-colors sm:p-5 ${active ? "border-primary bg-primary text-white" : "border-primary/15 bg-white text-primary hover:border-primary/45 hover:bg-light-surface"}`}
                  >
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${active ? "border-accent bg-accent text-primary" : "border-primary/30"}`} aria-hidden>
                      {active && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </span>
                    <span>
                      <span className="block font-display text-base font-semibold">{choice.label}</span>
                      <span className={`mt-1 block text-sm leading-6 ${active ? "text-white/75" : "text-ink/65"}`}>{choice.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : question.input ? (
            <div className="mt-8 pb-4">
              <label htmlFor={`question-${step}`} className="block text-sm font-semibold text-primary">{question.input.label}</label>
              <div className="relative mt-2 flex items-center border border-primary/20 bg-light-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-accent/40">
                <input
                  ref={inputRef}
                  id={`question-${step}`}
                  type={question.input.type}
                  value={answer}
                  min={question.input.min}
                  max={question.input.max}
                  step={question.id === "age" ? 1 : 1000}
                  inputMode={question.input.type === "number" ? "numeric" : undefined}
                  autoComplete={question.input.autoComplete}
                  placeholder={question.input.placeholder}
                  aria-invalid={showRequired || Boolean(saveError) || undefined}
                  onChange={(event) => updateAnswer(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      next();
                    }
                  }}
                  className={`min-h-14 min-w-0 flex-1 bg-transparent px-4 text-base text-primary outline-none placeholder:text-secondary/55 ${question.input.type === "date" ? "date-control w-full pr-12" : ""}`}
                />
                {question.input.suffix && <span className="pr-4 text-sm font-semibold text-secondary">{question.input.suffix}</span>}
                {question.input.type === "date" && <CalendarDays className="pointer-events-none absolute right-4 h-5 w-5 text-secondary" aria-hidden />}
              </div>
            </div>
          ) : null}
          {showRequired && <p role="alert" className="mt-3 text-sm font-medium text-risk">{saveError || "Please choose or enter an answer to continue."}</p>}
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-primary/10 bg-light-surface px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <button type="button" onClick={() => { setShowRequired(false); const previousStep = step - 1; persistDraft(previousStep, answers); setStep(previousStep); }} disabled={step === 0} className="inline-flex min-h-11 items-center justify-center gap-2 px-2 text-sm font-semibold text-primary transition-colors hover:text-secondary disabled:cursor-not-allowed disabled:opacity-35">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </button>
        <div className="text-right">
          {saveError && !showRequired && <p role="alert" className="mb-2 text-sm font-medium text-risk">{saveError}</p>}
          <button type="button" onClick={next} className="inline-flex min-h-12 items-center justify-center gap-3 bg-accent px-6 font-semibold text-primary transition-colors hover:bg-accent/90">
            {step === questions.length - 1 ? "Finish questionnaire" : "Continue"} <ArrowRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
