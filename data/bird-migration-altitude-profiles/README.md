# Bird migration altitude profiles

## Source

* [Bird migration altitude profiles](https://github.com/enram/case-study/tree/master/data/bird-migration-altitude-profiles)

Data were uploaded in CartoDB (PostgreSQL) to easily aggregate using SQL.

## Aggregation

```SQL
-- Set thresholds:
-- - Do not use data below 200m
-- - u_speed: radial_velocity_std and bird_density: below => set values to 0
-- - v_speed: radial_velocity_std and bird_density: : below => set values to 0
-- Aggregate:
-- - Aggregate on time frame (20 min)
-- - Aggregate on altitude band (200-1600m, 1600+ m) and name them 1 and 2
-- - Average u_speed
-- - Average v_speed

WITH threshold_data AS (
    SELECT
        radar_id,
        date_trunc('hour', start_time) + date_part('minute', start_time)::int / 20 * interval '20 min' AS interval_start_time,
        altitude,
        u_speed,
        CASE
            WHEN radial_velocity_std >= 2 AND bird_density >= 1 THEN u_speed
            ELSE null
        END AS threshold_u_speed,
        v_speed,
        CASE
            WHEN radial_velocity_std >= 2 AND bird_density >= 1 THEN v_speed
            ELSE null
        END AS threshold_v_speed
    FROM
        bird_migration_altitude_profiles
    WHERE
        altitude >= 0.2
)

SELECT
    radar_id,
    interval_start_time,
    CASE
        WHEN altitude >= 0.2 AND altitude < 1.6 THEN 1
        WHEN altitude >= 1.6 THEN 2
    END AS altitude_band,
    CASE
        WHEN avg(b.radial_velocity_std) >= 2 AND avg(b.bird_density) >= 1 THEN round(avg(b.u_speed)::numeric,5)
        ELSE 0
    END AS avg_u_speed,
    CASE
        WHEN avg(b.radial_velocity_std) >= 2 AND avg(b.bird_density) >= 1 THEN round(avg(b.v_speed)::numeric,5)
        ELSE 0
    END AS avg_v_speed,
    CASE
        WHEN avg(b.radial_velocity_std) >= 2 AND avg(b.bird_density) >= 1 THEN round(avg(b.bird_density)::numeric,5)
        ELSE 0
    END AS avg_bird_density
FROM
    bird_migration_altitude_profiles b
    LEFT JOIN radars r
    ON b.radar_id = r.radar_id
WHERE
    b.altitude >= 0.2
GROUP BY
    radar_id,
    interval_start_time,
    altitude_band
ORDER BY
    interval_start_time,
    radar_id,
    altitude_band
```

## Result

[aggregated-data.csv](aggregated-data.csv)
