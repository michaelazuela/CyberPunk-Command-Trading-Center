-- Scope Discord/RAG plan-version identity to the owning user.
-- Service-role writers must still filter by user_id in application code; this
-- unique index prevents duplicate user/plan_version_id rows from reappearing.

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, plan_version_id
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM trade_embeddings
  WHERE plan_version_id IS NOT NULL
    AND btrim(plan_version_id) <> ''
)
DELETE FROM trade_embeddings te
USING ranked r
WHERE te.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS trade_embeddings_user_plan_version_uidx
ON trade_embeddings (user_id, plan_version_id)
WHERE plan_version_id IS NOT NULL
  AND btrim(plan_version_id) <> '';
