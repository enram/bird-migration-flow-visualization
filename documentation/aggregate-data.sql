-- Aggregate bird_migration_altitude_profile data:
-- - Aggregate on time frame (e.g. 20 min)
-- - Aggregate on altitude band (e.g. 200-1600m, 1600+ m)
-- - Apply thresholds for radial_velocity_std and bird_density: below => set values to 0
-- - Average v_speed, u_speed, and b_bird_density
-- - Join with radar data to get coordinates
-- - Select a band and time: this query should return 4 out of 5 radars, one of which is below threshold. The 5th radar has no data.

WITH aggregated_data AS (
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
            WHEN avg(b.radial_velocity_std) >= 2 AND avg(b.bird_density) >= 10 THEN avg(b.u_speed)
            ELSE 0
        END AS avg_u_speed,
        CASE
            WHEN avg(b.radial_velocity_std) >= 2 AND avg(b.bird_density) >= 10 THEN avg(b.v_speed)
            ELSE 0
        END AS avg_v_speed,
        CASE
            WHEN avg(b.radial_velocity_std) >= 2 AND avg(b.bird_density) >= 10 THEN avg(b.bird_density)
            ELSE 0
        END AS avg_bird_density
    FROM
        bird_migration_altitude_profiles b
    LEFT JOIN
        radars r
    ON
        b.radar_id = r.radar_id
    WHERE
        b.altitude >= 0.2
    GROUP BY
        b.radar_id,
        r.the_geom,
        interval_start_time,
        altitude_band
    ORDER BY
        b.radar_id,
        interval_start_time,
        altitude_band DESC
)

SELECT
    *
FROM
    aggregated_data
WHERE
    altitude_band = 1
    AND interval_start_time = '2013-04-09T23:00:00'
