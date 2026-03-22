"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface PageRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function PageReveal({
  children,
  className = "",
  delay = 0,
}: PageRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.opacity = "1";
      return;
    }
    el.style.animationDelay = `${delay}ms`;
    el.classList.add("animate-reveal");
  }, [delay]);

  return (
    <div ref={ref} className={className} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
