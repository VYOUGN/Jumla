"use client";

// A guided tour: dims the page, lights up one element at a time and explains it.
// Which tours a person has finished is kept on their profile (so other devices
// skip it too) and in this browser (so it never flashes twice).

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useProgress } from "../ProgressProvider";

export type TourStep = {
  /** CSS selectors; the first visible match is highlighted. No target = a centered card. */
  target?: string[];
  title: string;
  body: string;
  /** Leave the step out when its target isn't on screen (e.g. hidden on phones). */
  optional?: boolean;
};

const storageKey = (userId: string) => `jumla.tours.${userId}`;

function seenOnDevice(userId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId)) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function forgetToursOnDevice(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // Storage unavailable: nothing was remembered on this device anyway.
  }
}

async function markSeen(userId: string, name: string): Promise<void> {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...new Set([...seenOnDevice(userId), name])]));
  } catch {
    // Storage unavailable: the profile still records it below.
  }
  const sb = supabaseBrowser();
  const { data, error } = await sb.from("profiles").select("tours_seen").eq("id", userId).maybeSingle();
  if (error) return;
  const current = ((data as { tours_seen?: string[] } | null)?.tours_seen ?? []) as string[];
  if (!current.includes(name)) await sb.from("profiles").update({ tours_seen: [...current, name] }).eq("id", userId);
}

/** Opens the tour once per person (after `ready`), and lets a help button replay it. */
export function useTour(name: string, seenOnServer: boolean, ready = true) {
  const { userId } = useProgress();
  const [open, setOpen] = useState(false);
  const decided = useRef(false);

  useEffect(() => {
    if (!ready || decided.current) return;
    if (seenOnServer || seenOnDevice(userId).includes(name)) {
      decided.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      decided.current = true;
      setOpen(true);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [ready, seenOnServer, userId, name]);

  const close = useCallback(() => {
    setOpen(false);
    void markSeen(userId, name);
  }, [userId, name]);
  const start = useCallback(() => setOpen(true), []);

  return { open, start, close };
}

function isVisible(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function findTarget(selectors?: string[]): HTMLElement | null {
  for (const s of selectors ?? []) {
    for (const el of document.querySelectorAll<HTMLElement>(s)) if (isVisible(el)) return el;
  }
  return null;
}

type Box = { top: number; left: number; width: number; height: number };

export function Tour({ steps, open, onClose }: { steps: TourStep[]; open: boolean; onClose: () => void }) {
  const [list, setList] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const nextButton = useRef<HTMLButtonElement>(null);
  const stepsRef = useRef(steps);

  useEffect(() => {
    stepsRef.current = steps;
  });

  // Fix the step list when the tour opens, dropping steps for things not on screen.
  useEffect(() => {
    if (!open) return;
    setList(stepsRef.current.filter((s) => !s.optional || findTarget(s.target)));
    setIndex(0);
  }, [open]);

  const step = open ? list[index] : undefined;

  const measure = useCallback(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight });
    const el = findTarget(step?.target);
    if (!el) return setBox(null);
    const r = el.getBoundingClientRect();
    setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useEffect(() => {
    if (!step) return;
    findTarget(step.target)?.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();
    const settle = window.setTimeout(measure, 400);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    nextButton.current?.focus({ preventScroll: true });
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, measure]);

  const next = useCallback(() => {
    if (index + 1 < list.length) setIndex(index + 1);
    else onClose();
  }, [index, list.length, onClose]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // While the tour is open, keys drive the tour and never reach the lesson behind it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key === "Escape") onClose();
      else if (e.key === "Enter" || e.key === "ArrowLeft") next();
      else if (e.key === "ArrowRight") back();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, next, back, onClose]);

  if (!step) return null;

  const pad = 8;
  const cardWidth = Math.min(340, viewport.w - 32);
  let cardStyle: React.CSSProperties;
  if (box) {
    const below = viewport.h - (box.top + box.height);
    const above = box.top;
    const left = Math.min(Math.max(box.left + box.width / 2 - cardWidth / 2, 16), viewport.w - cardWidth - 16);
    if (Math.max(below, above) < 200) cardStyle = { left, bottom: 16 };
    else if (below >= above) cardStyle = { left, top: box.top + box.height + pad + 10 };
    else cardStyle = { left, bottom: viewport.h - box.top + pad + 10 };
  } else {
    cardStyle = { left: Math.max(16, (viewport.w - cardWidth) / 2), top: Math.max(16, viewport.h / 2 - 130) };
  }

  const last = index === list.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={step.title}>
      {/* Blocks clicks on the page while the tour is open. */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      {box ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-accent transition-all duration-300"
          style={{
            top: box.top - pad,
            left: box.left - pad,
            width: box.width + pad * 2,
            height: box.height + pad * 2,
            boxShadow: "0 0 0 9999px rgba(3, 4, 8, 0.72)",
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-black/70" />
      )}
      <div className="card absolute animate-pop p-5 shadow-2xl" style={{ ...cardStyle, width: cardWidth }}>
        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted">
          <span>جولة تعريفية</span>
          <span className="en">
            {index + 1} / {list.length}
          </span>
        </div>
        <h2 className="text-lg font-bold">{step.title}</h2>
        <p className="mt-2 text-sm leading-7 text-muted">{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <button ref={nextButton} className="btn btn-primary btn-sm" onClick={next}>
            {last ? "يلا نبدأ" : "التالي ←"}
          </button>
          {index > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={back}>
              السابق
            </button>
          )}
          {!last && (
            <button className="ms-auto text-sm text-muted hover:text-text" onClick={onClose}>
              تخطّي الجولة
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
