"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useLayoutEffect,
} from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VirtualItem {
  index: number;
  height: number;
}

interface UseVirtualMessagesOptions {
  /** Total number of messages */
  count: number;
  /** Estimate the height of message at index i */
  estimateHeight: (index: number, width: number) => number;
  /** Overscan in pixels above/below the viewport */
  overscan?: number;
  /** Header offset in px — accounts for fixed nav, title, etc. */
  headerOffset?: number;
}

interface VirtualState {
  /** Items to render */
  items: VirtualItem[];
  /** Height of the spacer before rendered items */
  paddingTop: number;
  /** Height of the spacer after rendered items */
  paddingBottom: number;
  /** Start index (inclusive) */
  startIndex: number;
  /** End index (exclusive) */
  endIndex: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVirtualMessages({
  count,
  estimateHeight,
  overscan = 1500,
  headerOffset = 0,
}: UseVirtualMessagesOptions): {
  virtual: VirtualState;
  containerRef: React.RefObject<HTMLDivElement | null>;
  measureRef: (index: number) => (el: HTMLDivElement | null) => void;
  scrollToIndex: (index: number) => void;
} {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [scrollTop, setScrollTop] = useState(
    typeof window !== "undefined" ? window.scrollY : 0
  );
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 900
  );
  const [measuredHeights, setMeasuredHeights] = useState<Record<number, number>>(
    {}
  );

  // Track mounted element refs for ResizeObserver
  const elementsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Combine measured heights with current estimates
  // ---------------------------------------------------------------------------

  const heights = useMemo(() => {
    const next = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      const measuredHeight =
        i in measuredHeights ? measuredHeights[i] : undefined;
      next[i] =
        measuredHeight === undefined
          ? estimateHeight(i, containerWidth)
          : measuredHeight;
    }
    return next;
  }, [count, measuredHeights, estimateHeight, containerWidth]);

  // ---------------------------------------------------------------------------
  // Compute offsets and visible range
  // ---------------------------------------------------------------------------

  const virtual = useMemo((): VirtualState => {
    // Build prefix sum of offsets
    let totalHeight = 0;
    const offsets = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      offsets[i] = totalHeight;
      totalHeight += heights[i];
    }

    // Adjusted scrollTop accounts for header offset (nav, title area)
    const adjustedScrollTop = Math.max(0, scrollTop - headerOffset);
    const rangeStart = adjustedScrollTop - overscan;
    const rangeEnd = adjustedScrollTop + viewportHeight + overscan;

    // Binary search for start index
    let lo = 0;
    let hi = count;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (offsets[mid] + heights[mid] < rangeStart) lo = mid + 1;
      else hi = mid;
    }
    const startIndex = lo;

    // Linear scan for end index (overscan window is bounded)
    let endIndex = startIndex;
    while (endIndex < count && offsets[endIndex] < rangeEnd) {
      endIndex++;
    }

    // Spacer heights: un-rendered items above and below
    const paddingTop = startIndex > 0 ? offsets[startIndex] : 0;
    let paddingBottom = 0;
    for (let i = endIndex; i < count; i++) {
      paddingBottom += heights[i];
    }

    // Build visible items (in normal flow — no absolute offsets)
    const items: VirtualItem[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      items.push({ index: i, height: heights[i] });
    }

    return { items, paddingTop, paddingBottom, startIndex, endIndex };
  }, [count, heights, scrollTop, viewportHeight, overscan, headerOffset]);

  // ---------------------------------------------------------------------------
  // Scroll listener (rAF-throttled)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          setScrollTop(window.scrollY);
          ticking = false;
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ---------------------------------------------------------------------------
  // Viewport height + container width via ResizeObserver
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // ---------------------------------------------------------------------------
  // Measure-and-correct: ResizeObserver on rendered message elements
  // ---------------------------------------------------------------------------

  useLayoutEffect(() => {
    const ro = new ResizeObserver((entries) => {
      let needsRecalc = false;
      for (const entry of entries) {
        const index = Number(
          (entry.target as HTMLElement).dataset.virtualIndex
        );
        if (Number.isNaN(index)) continue;

        const newHeight = entry.contentRect.height;
        const oldHeight = heights[index];

        if (Math.abs(newHeight - oldHeight) > 1) {
          setMeasuredHeights((prev) => {
            const current = prev[index];
            if (current !== undefined && Math.abs(current - newHeight) <= 1) {
              return prev;
            }
            needsRecalc = true;
            return { ...prev, [index]: newHeight };
          });
        }
      }

      if (needsRecalc) {
        // Force re-render to recalculate virtual state
        setScrollTop(window.scrollY);
      }
    });

    resizeObserverRef.current = ro;

    // Observe any already-mounted elements
    for (const [, el] of elementsRef.current) {
      ro.observe(el);
    }

    return () => ro.disconnect();
  }, [heights]);

  // ---------------------------------------------------------------------------
  // measureRef callback — attach/detach elements to ResizeObserver
  // ---------------------------------------------------------------------------

  const measureRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      const elements = elementsRef.current;
      const ro = resizeObserverRef.current;

      if (el) {
        elements.set(index, el);
        ro?.observe(el);
      } else {
        const prev = elements.get(index);
        if (prev) {
          ro?.unobserve(prev);
          elements.delete(index);
        }
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // scrollToIndex — for permalink navigation
  // ---------------------------------------------------------------------------

  const scrollToIndex = useCallback(
    (index: number) => {
      let offset = 0;
      for (let i = 0; i < Math.min(index, count); i++) {
        offset += heights[i];
      }
      window.scrollTo({
        top: offset + headerOffset,
        behavior: "instant",
      });
    },
    [count, heights, headerOffset]
  );

  return { virtual, containerRef, measureRef, scrollToIndex };
}
