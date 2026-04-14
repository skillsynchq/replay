"use client";

import { useMemo, useState } from "react";
import type { EcgDayData } from "@/lib/ecg-data";

const VIEW_WIDTH = 360;
const RULER_HEIGHT = 12;
const CHART_HEIGHT = 120;
const VIEW_HEIGHT = CHART_HEIGHT;
const BASELINE_Y = 60;
const MAX_AMPLITUDE = 45;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildEcgPath(values: number[], maxVal: number): string {
  const dayWidth = VIEW_WIDTH / values.length;
  const parts: string[] = [`M 0 ${BASELINE_Y}`];

  for (let i = 0; i < values.length; i++) {
    const x = (i + 0.5) * dayWidth;
    const normalized = maxVal > 0 ? values[i] / maxVal : 0;
    const amp = normalized * MAX_AMPLITUDE;

    if (amp < 0.5) {
      parts.push(`L ${x} ${BASELINE_Y}`);
      continue;
    }

    const qX = x - dayWidth * 0.2;
    const rX = x;
    const sX = x + dayWidth * 0.1;
    const tX = x + dayWidth * 0.22;
    const endX = x + dayWidth * 0.32;

    parts.push(
      `L ${qX} ${BASELINE_Y}`,
      `L ${qX + dayWidth * 0.05} ${BASELINE_Y + amp * 0.3}`,
      `L ${rX} ${BASELINE_Y - amp}`,
      `L ${sX} ${BASELINE_Y + amp}`,
      `L ${tX} ${BASELINE_Y - amp * 0.25}`,
      `L ${endX} ${BASELINE_Y}`
    );
  }

  parts.push(`L ${VIEW_WIDTH} ${BASELINE_Y}`);
  return parts.join(" ");
}

interface EcgChartProps {
  data: EcgDayData[];
}

export function EcgChart({ data }: EcgChartProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const path = useMemo(() => {
    const values = data.map((d) => d.count);
    return buildEcgPath(values, Math.max(...values, 1));
  }, [data]);

  const dayWidth = VIEW_WIDTH / data.length;

  const tooltipWidth = 130;
  const hoveredX = hoveredDay !== null ? (hoveredDay + 0.5) * dayWidth : 0;
  const tooltipFlipped =
    hoveredDay !== null && hoveredX + tooltipWidth + 12 > VIEW_WIDTH;
  const tooltipX = tooltipFlipped
    ? hoveredX - tooltipWidth - 8
    : hoveredX + 8;

  return (
    <div>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-[100px] w-full"
        preserveAspectRatio="xMaxYMid meet"
        role="img"
        aria-label={`Prompt activity over the last ${data.length} days`}
      >
        {/* Fine grid — horizontal (every 10px) */}
        {Array.from({ length: Math.floor(CHART_HEIGHT / 10) - 1 }, (_, i) => {
          const y = (i + 1) * 10;
          const isMajor = y % 30 === 0;
          return (
            <line
              key={`h-${i}`}
              x1={0}
              y1={y}
              x2={VIEW_WIDTH}
              y2={y}
              stroke="var(--border)"
              strokeWidth={isMajor ? 0.5 : 0.25}
              opacity={isMajor ? 0.6 : 0.3}
            />
          );
        })}

        {/* Fine grid — vertical (aligned to day subdivisions) */}
        {(() => {
          const subdivisions = 4;
          const totalTicks = data.length * subdivisions;
          const lines: React.ReactElement[] = [];
          for (let t = 1; t < totalTicks; t++) {
            const x = (t / totalTicks) * VIEW_WIDTH;
            const isDay = t % subdivisions === 0;
            const isWeek = t % (7 * subdivisions) === 0;
            lines.push(
              <line
                key={`v-${t}`}
                x1={x}
                y1={0}
                x2={x}
                y2={CHART_HEIGHT}
                stroke="var(--border)"
                strokeWidth={isWeek ? 0.5 : isDay ? 0.4 : 0.25}
                opacity={isWeek ? 0.6 : isDay ? 0.4 : 0.15}
              />
            );
          }
          return lines;
        })()}

        {/* Ruler — ECG calibration strip (ticks grow upward from bottom) */}
        {(() => {
          const ticks: React.ReactElement[] = [];
          const subdivisions = 4;
          const totalTicks = data.length * subdivisions;
          for (let t = 0; t <= totalTicks; t++) {
            const x = (t / totalTicks) * VIEW_WIDTH;
            const isDay = t % subdivisions === 0;
            const isWeek = t % (7 * subdivisions) === 0;
            const h = isWeek ? RULER_HEIGHT : isDay ? RULER_HEIGHT * 0.6 : RULER_HEIGHT * 0.25;
            const w = isWeek ? 0.75 : isDay ? 0.5 : 0.3;
            const o = isWeek ? 0.7 : isDay ? 0.45 : 0.2;
            ticks.push(
              <line
                key={`tick-${t}`}
                x1={x}
                y1={CHART_HEIGHT}
                x2={x}
                y2={CHART_HEIGHT - h}
                stroke="var(--accent)"
                strokeWidth={w}
                opacity={o}
              />
            );
          }
          return ticks;
        })()}

        {/* ECG trace */}
        <path
          d={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeLinejoin="bevel"
        />

        {/* Hover rects */}
        {data.map((d, i) => (
          <rect
            key={d.day}
            x={i * dayWidth}
            y={0}
            width={dayWidth}
            height={CHART_HEIGHT}
            fill="transparent"
            onMouseEnter={() => setHoveredDay(i)}
            onMouseLeave={() => setHoveredDay(null)}
          >
            <title>{`${formatDate(d.day)}: ${d.count} prompts`}</title>
          </rect>
        ))}

        {/* Hover indicator */}
        {hoveredDay !== null && (
          <>
            <line
              x1={hoveredX}
              y1={0}
              x2={hoveredX}
              y2={CHART_HEIGHT}
              stroke="var(--border-hover)"
              strokeWidth={0.5}
              strokeDasharray="2 3"
            />

            <g
              transform={`translate(${tooltipX}, 6)`}
              style={{ pointerEvents: "none" }}
            >
              <rect
                x={0}
                y={0}
                width={tooltipWidth}
                height={38}
                rx={4}
                fill="var(--surface)"
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={10}
                y={18}
                fill="var(--fg-muted)"
                fontSize={10}
                fontFamily="var(--font-jetbrains-mono), monospace"
              >
                {formatDate(data[hoveredDay].day)}
              </text>
              <text
                x={10}
                y={32}
                fill="var(--accent)"
                fontSize={10}
                fontFamily="var(--font-jetbrains-mono), monospace"
              >
                {data[hoveredDay].count} prompts
              </text>
            </g>
          </>
        )}
      </svg>
    </div>
  );
}
