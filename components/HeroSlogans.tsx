"use client";

import { useEffect, useState } from "react";

export type HeroSlogan = {
  lead: string;
  accent: string;
};

type HeroSlogansProps = {
  slogans: HeroSlogan[];
  accessibleLabel: string;
  pauseLabel: string;
  resumeLabel: string;
};

const ROTATION_INTERVAL_MS = 4400;

export function HeroSlogans({ slogans, accessibleLabel, pauseLabel, resumeLabel }: HeroSlogansProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (slogans.length < 2) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let intervalId: number | undefined;

    const stopRotation = () => {
      if (intervalId !== undefined) window.clearInterval(intervalId);
      intervalId = undefined;
    };

    const startRotation = () => {
      stopRotation();
      if (isPaused || reducedMotion.matches || document.visibilityState !== "visible") return;
      intervalId = window.setInterval(() => {
        setActiveIndex((current) => (current + 1) % slogans.length);
      }, ROTATION_INTERVAL_MS);
    };

    const handleMotionPreference = () => {
      if (reducedMotion.matches) setActiveIndex(0);
      startRotation();
    };

    startRotation();
    reducedMotion.addEventListener("change", handleMotionPreference);
    document.addEventListener("visibilitychange", startRotation);

    return () => {
      stopRotation();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      document.removeEventListener("visibilitychange", startRotation);
    };
  }, [isPaused, slogans.length]);

  return (
    <div className="hero-slogan-shell">
      <h1 className="hero-slogans">
        <span className="sr-only">{accessibleLabel}</span>
        <span className="hero-slogan-stage" aria-hidden="true">
          {slogans.map((slogan, index) => (
            <span className={`hero-slogan${index === activeIndex ? " is-active" : ""}`} key={`${slogan.lead}-${slogan.accent}`}>
              <span>{slogan.lead}</span>
              <em>{slogan.accent}</em>
            </span>
          ))}
        </span>
      </h1>
      <button
        type="button"
        className="hero-slogan-toggle"
        aria-pressed={isPaused}
        onClick={() => setIsPaused((paused) => !paused)}
      >
        <span aria-hidden="true">{isPaused ? "▶" : "Ⅱ"}</span>
        {isPaused ? resumeLabel : pauseLabel}
      </button>
    </div>
  );
}
