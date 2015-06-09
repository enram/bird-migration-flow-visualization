# Bird density

## Source

* [Bird migration altitude profiles](https://github.com/enram/case-study/tree/master/data/bird-migration-altitude-profiles)

Data were uploaded in CartoDB to easily aggregate using SQL.

## Aggregation

```SQL
-- Average bird density per interval
-- - If some requirements are met for density
-- - For the lower altitude band
-- - Over all radars

SELECT
    date_trunc('hour', b.start_time) + date_part('minute', b.start_time)::int / 20 * interval '20 min' AS interval_start_time,
    CASE
        WHEN avg(b.radial_velocity_std) >= 2 AND avg(b.bird_density) >= 10 THEN round(avg(b.bird_density)::numeric,5)
        ELSE 0
    END AS avg_bird_density
FROM
    bird_migration_altitude_profiles b
WHERE
    b.altitude >= 0.2
    AND b.altitude < 1.6
GROUP BY
    interval_start_time
ORDER BY
    interval_start_time
```

## Result

[average-density.csv](average-density.csv)
