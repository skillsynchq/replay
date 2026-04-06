import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface EcgDayData {
  day: string;
  count: number;
}

export async function fetchEcgData(userId: string): Promise<EcgDayData[]> {
  const result = await db.execute<{
    day: string;
    count: string;
  }>(sql`
    WITH days AS (
      SELECT d::date AS day
      FROM generate_series(
        CURRENT_DATE - INTERVAL '13 days',
        CURRENT_DATE,
        '1 day'
      ) d
    ),
    counts AS (
      SELECT
        (m.timestamp AT TIME ZONE 'UTC')::date AS day,
        COUNT(*) AS count
      FROM message m
      JOIN thread t ON t.id = m.thread_id
      WHERE t.owner_id = ${userId}
        AND m.role = 'user'
        AND m.timestamp >= CURRENT_DATE - INTERVAL '13 days'
      GROUP BY (m.timestamp AT TIME ZONE 'UTC')::date
    )
    SELECT
      d.day::text,
      COALESCE(c.count, 0) AS count
    FROM days d
    LEFT JOIN counts c ON c.day = d.day
    ORDER BY d.day
  `);

  return result.rows.map((row) => ({
    day: row.day,
    count: Number(row.count),
  }));
}
