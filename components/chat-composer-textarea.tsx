"use client";

import { useCallback, useEffect, useRef, type ChangeEvent } from "react";

type Props = {
  id: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  disabled?: boolean;
  maxLength?: number;
  describedBy?: string;
  className: string;
  keyboardScroll?: boolean;
};

export function ChatComposerTextarea({ id, value, onChange, placeholder, disabled, maxLength, describedBy, className, keyboardScroll = true }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollTimerRef = useRef<number>(0);
  const originalMarginRef = useRef<string | null>(null);

  const keepVisible = useCallback(() => {
    if (!keyboardScroll) return;
    window.clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = window.setTimeout(() => {
      const textarea = textareaRef.current;
      const visualViewport = window.visualViewport;
      if (!textarea || document.activeElement !== textarea || !visualViewport) return;
      const form = textarea.form;
      if (form) {
        if (originalMarginRef.current === null) originalMarginRef.current = form.style.marginBottom;
        const keyboardInset = Math.max(0, window.innerHeight - visualViewport.offsetTop - visualViewport.height);
        form.style.marginBottom = `${Math.ceil(keyboardInset)}px`;
      }
      window.requestAnimationFrame(() => {
        if (document.activeElement !== textarea) return;
        const visibleBottom = visualViewport.offsetTop + visualViewport.height;
        const overlap = textarea.getBoundingClientRect().bottom - visibleBottom + 12;
        if (overlap > 0) window.scrollBy(0, Math.ceil(overlap));
      });
    }, 150);
  }, [keyboardScroll]);

  useEffect(() => {
    if (!keyboardScroll) return;
    const visualViewport = window.visualViewport;
    const textarea = textareaRef.current;
    visualViewport?.addEventListener("resize", keepVisible);
    return () => {
      visualViewport?.removeEventListener("resize", keepVisible);
      window.clearTimeout(scrollTimerRef.current);
      const form = textarea?.form;
      if (form && originalMarginRef.current !== null) form.style.marginBottom = originalMarginRef.current;
    };
  }, [keyboardScroll, keepVisible]);

  return (
    <textarea
      ref={textareaRef}
      id={id}
      rows={2}
      value={value}
      maxLength={maxLength}
      onChange={onChange}
      onFocus={keepVisible}
      onBlur={(event) => {
        window.clearTimeout(scrollTimerRef.current);
        const form = event.currentTarget.form;
        if (form && originalMarginRef.current !== null) form.style.marginBottom = originalMarginRef.current;
        originalMarginRef.current = null;
      }}
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
      className={`${className} h-24 resize-none overflow-y-auto text-base leading-6`}
    />
  );
}
