-- The dashboard numbers (GET /api/stats), computed in the database. `days` is the length of the per-day series,
-- ending today (UTC), with zero-count days included. Returns the JSON shape of TicketStats in @helpdesk/core.
CREATE OR REPLACE FUNCTION ticket_stats(days integer DEFAULT 30) RETURNS jsonb
LANGUAGE sql STABLE AS $$
  WITH totals AS (
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE t."status" = 'OPEN') AS open,
      -- An AI reply (no author) is only ever saved when the AI resolves a ticket
      count(*) FILTER (
        WHERE t."status" IN ('RESOLVED', 'CLOSED')
          AND EXISTS (SELECT 1 FROM "reply" r WHERE r."ticketId" = t."id" AND r."authorId" IS NULL)
      ) AS resolved_by_ai,
      avg(extract(epoch FROM (t."resolvedAt" - t."createdAt"))) FILTER (WHERE t."resolvedAt" IS NOT NULL) AS avg_seconds
    FROM "ticket" t
  ),
  per_day AS (
    SELECT d AS day, count(t."id") AS tickets
    FROM generate_series(
      ((now() AT TIME ZONE 'utc')::date - (days - 1))::timestamp,
      (now() AT TIME ZONE 'utc')::date::timestamp,
      interval '1 day'
    ) AS d
    LEFT JOIN "ticket" t ON t."createdAt" >= d AND t."createdAt" < d + interval '1 day'
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
