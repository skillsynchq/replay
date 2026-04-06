"use client";

import { useEffect, useState } from "react";

const WORDS = [
  "Claude Code",
  "Codex",
  "Cursor",
  "AI coding",
];

export function RotatingText() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % WORDS.length);
        setVisible(true);
      }, 200);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="inline-block text-fg-muted transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {WORDS[index]}
    </span>
  );
}
