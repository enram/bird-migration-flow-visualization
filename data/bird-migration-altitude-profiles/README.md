# Bird migration altitude profiles

## Source

* [Bird migration altitude profiles](https://github.com/enram/case-study/tree/master/data/bird-migration-altitude-profiles)
* [Radars](https://github.com/enram/case-study/tree/master/data/radars)

Data were uploaded in CartoDB to easily join and aggregate using SQL.

## Aggregation

```SQL
-- Aggregate bird_migration_altitude_profile data:
-- - Aggregate on time frame (20 min)
-- - Aggregate on altitude band (200-1600m, 1600+ m) and name them 1 and 2
-- - Apply thresholds for radial_velocity_std and bird_density: below => set values to 0
-- - Average and round v_speed, u_speed, and b_bird_density
-- - Join with radar data to get coordinates
-- Since we want all data, there is no WHERE clause of WITH construct

-- Aggregate bird_migration_altitude_profile data:
-- - Aggregate on time frame (20 min)
-- - Aggregate on altitude band (200-1600m, 1600+ m) and name them 1 and 2
-- - Apply thresholds for radial_velocity_std and bird_density: below => set values to 0
-- - Average and round v_speed, u_speed, and b_bird_density
-- - Join with radar data to get coordinates
-- Since we want all data, there is no WHERE clause of WITH construct

SELECT
    b.radar_id,
    ST_X(r.the_geom) AS longitude,
    ST_Y(r.the_geom) AS latitude,
    date_trunc('hour', b.start_time) + date_part('minute', b.start_time)::int / 20 * interval '20 min' AS interval_start_time,
    CASE
        WHEN b.altitude >= 0.2 AND b.altitude < 1.6 THEN 1
        WHEN b.altitude >= 1.6 THEN 2
    END AS altitude_band,
    count(*) AS number_of_measurements,
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
    b.radar_id,
    r.the_geom,
    interval_start_time,
    altitude_band
ORDER BY
    interval_start_time,
    b.radar_id,
    altitude_band
```

## Result

[aggregated-data.csv](aggregated-data.csv)
