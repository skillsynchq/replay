import { ImageResponse } from "next/og";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { thread } from "@/lib/db/schema";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Thread preview";

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const rows = await db
    .select()
    .from(thread)
    .where(eq(thread.slug, slug))
    .limit(1);

  const threadRow = rows[0];
  if (!threadRow || threadRow.visibility === "private") {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0c0a09",
            color: "#f5f5f4",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 34,
          }}
        >
          replay.md
        </div>
      ),
      { ...size }
    );
  }

  const ownerRows = await db.execute<{
    name: string;
    username: string | null;
  }>(
    sql`SELECT name, username FROM "user" WHERE id = ${threadRow.ownerId} LIMIT 1`
  );
  const owner = ownerRows.rows?.[0] ?? { name: "Unknown", username: null };

  const agentLabel =
    threadRow.agent === "claude"
      ? "Claude Code"
      : threadRow.agent === "codex"
        ? "Codex"
        : threadRow.agent;

  const promptCount = Math.floor(threadRow.messageCount / 2);
  const title = threadRow.title ?? "Untitled conversation";
  const displayTitle =
    title.length > 90 ? title.slice(0, 87) + "..." : title;

  const fontData = await fetch(
    new URL("./assets/JetBrainsMono-Regular.ttf", import.meta.url)
  ).then((r) => r.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0c0a09",
          color: "#f5f5f4",
          fontFamily: "JetBrains Mono",
          padding: "60px 72px",
        }}
      >
        {/* Top: site name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: 16,
            color: "#78716c",
          }}
        >
          replay.md
        </div>

        {/* Middle: title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 40,
              fontWeight: 500,
              lineHeight: 1.2,
              color: "#f5f5f4",
            }}
          >
            {displayTitle}
          </div>
        </div>

        {/* Bottom: metadata row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 16,
            color: "#a8a29e",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <span>{owner.name}</span>
            <span style={{ color: "#44403c" }}>·</span>
            <span style={{ color: "#f97316" }}>{agentLabel}</span>
            {threadRow.model && (
              <>
                <span style={{ color: "#44403c" }}>·</span>
                <span>{threadRow.model}</span>
              </>
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <span>{promptCount} prompts</span>
            <span style={{ color: "#44403c" }}>·</span>
            <span>{threadRow.messageCount} messages</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "JetBrains Mono",
          data: fontData,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
}
