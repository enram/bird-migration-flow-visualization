-- Find min/max datetime in bird_migration_altitude_profile data

WITH aggregated_data AS (
    SELECT
        date_trunc('hour', b.start_time) + date_part('minute', b.start_time)::int / 20 * interval '20 min' AS interval_start_time
    FROM
        bird_migration_altitude_profiles b
)

SELECT
    min(interval_start_time),
    max(interval_start_time)
FROM
    aggregated_data
