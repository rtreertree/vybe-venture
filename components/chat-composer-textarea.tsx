"use client";

import { useLayoutEffect, useRef, type ChangeEvent, type FocusEvent } from "react";

type Props = {
  id: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  disabled?: boolean;
  maxLength?: number;
  describedBy?: string;
  className: string;
};

export function ChatComposerTextarea({ id, value, onChange, placeholder, disabled, maxLength, describedBy, className }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [value]);

  const handleFocus = (event: FocusEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    // The visual viewport moves after focus on mobile Safari and Chrome.
    window.setTimeout(() => {
      if (document.activeElement === textarea) textarea.scrollIntoView({ block: "nearest" });
    }, 300);
  };

  return (
    <textarea
      ref={textareaRef}
      id={id}
      rows={1}
      value={value}
      maxLength={maxLength}
      onChange={onChange}
      onFocus={handleFocus}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || window.matchMedia("(pointer: coarse)").matches) return;
        event.preventDefault();
        event.currentTarget.form?.requestSubmit();
      }}
      placeholder={placeholder}
      disabled={disabled}
      aria-describedby={describedBy}
      enterKeyHint="enter"
      autoCapitalize="sentences"
      className={`${className} max-h-40 resize-none overflow-y-auto text-base leading-6`}
    />
  );
}
