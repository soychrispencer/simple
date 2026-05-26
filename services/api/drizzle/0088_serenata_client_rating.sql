ALTER TABLE "serenatas"
    ADD COLUMN IF NOT EXISTS "client_rating" smallint;
--> statement-breakpoint

UPDATE "serenata_provider_groups" AS g
SET
    "rating_count" = stats.cnt,
    "rating_average" = stats.avg,
    "updated_at" = NOW()
FROM (
    SELECT
        s."provider_group_id",
        COUNT(*)::integer AS cnt,
        COALESCE(ROUND(AVG(s."client_rating")::numeric, 2), 0) AS avg
    FROM "serenatas" AS s
    WHERE
        s."provider_group_id" IS NOT NULL
        AND s."client_rating" IS NOT NULL
        AND s."client_confirmed_at" IS NOT NULL
        AND s."client_rating" BETWEEN 1 AND 5
    GROUP BY s."provider_group_id"
) AS stats
WHERE g."id" = stats."provider_group_id";
