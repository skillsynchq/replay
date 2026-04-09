"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TraceCard } from "./trace-card";

interface TraceItem {
  id: string;
  slug: string;
  question: string;
  title?: string | null;
  status: string;
  createdAt: string;
  projectPath?: string | null;
}

export function TraceList({ initialTraces }: { initialTraces: TraceItem[] }) {
  const router = useRouter();
  const [traces, setTraces] = useState(initialTraces);

  async function handleDelete(slug: string) {
    setTraces((prev) => prev.filter((t) => t.slug !== slug));

    const res = await fetch(`/api/traces/${slug}`, { method: "DELETE" });
    if (!res.ok) {
      // Revert on failure
      setTraces(initialTraces);
    } else {
      router.refresh();
    }
  }

  if (traces.length === 0) return null;

  return (
    <div className="mx-auto max-w-2xl pb-12">
      <p className="font-mono text-[10px] uppercase tracking-widest text-accent mb-3">
        Previous Traces
      </p>
      <div className="space-y-2">
        {traces.map((trace) => (
          <TraceCard
            key={trace.id}
            slug={trace.slug}
            question={trace.question}
            title={trace.title}
            status={trace.status}
            createdAt={trace.createdAt}
            projectPath={trace.projectPath}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
