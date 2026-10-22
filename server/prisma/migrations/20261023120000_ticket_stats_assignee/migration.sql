-- ticket_stats can now be limited to the tickets assigned to one user (the dashboard's "My tickets" view).
-- `assignee_id` NULL means every ticket. A new argument makes a new overload, so the old function is dropped first.
DROP FUNCTION IF EXISTS ticket_stats(integer);

CREATE OR REPLACE FUNCTION ticket_stats(days integer DEFAULT 30, assignee_id text DEFAULT NULL) RETURNS jsonb
LANGUAGE sql STABLE AS $$
  WITH scoped AS (
    SELECT * FROM "ticket" t WHERE assignee_id IS NULL OR t."assignedToId" = assignee_id
  ),
  totals AS (
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE t."status" = 'OPEN') AS open,
      -- An AI reply (no author) is only ever saved when the AI resolves a ticket
      count(*) FILTER (
        WHERE t."status" IN ('RESOLVED', 'CLOSED')
          AND EXISTS (SELECT 1 FROM "reply" r WHERE r."ticketId" = t."id" AND r."authorId" IS NULL)
      ) AS resolved_by_ai,
      avg(extract(epoch FROM (t."resolvedAt" - t."createdAt"))) FILTER (WHERE t."resolvedAt" IS NOT NULL) AS avg_seconds
    FROM scoped t
  ),
  per_day AS (
    SELECT d AS day, count(t."id") AS tickets
    FROM generate_series(
      ((now() AT TIME ZONE 'utc')::date - (days - 1))::timestamp,
      (now() AT TIME ZONE 'utc')::date::timestamp,
      interval '1 day'
    ) AS d
    LEFT JOIN scoped t ON t."createdAt" >= d AND t."createdAt" < d + interval '1 day'
    GROUP BY d
  )
  SELECT jsonb_build_object(
    'total', totals.total,
    'open', totals.open,
    'resolvedByAi', totals.resolved_by_ai,
    'resolvedByAiPercent', CASE WHEN totals.total = 0 THEN 0 ELSE round(totals.resolved_by_ai * 100.0 / totals.total, 1) END,
    'averageResolutionSeconds', totals.avg_seconds,
    'ticketsPerDay', (
      SELECT jsonb_agg(jsonb_build_object('date', to_char(p.day, 'YYYY-MM-DD'), 'count', p.tickets) ORDER BY p.day)
      FROM per_day p
    )
  )
  FROM totals;
$$;
