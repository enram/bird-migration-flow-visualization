-- Aggregate bird_migration_altitude_profile data:
-- - Aggregate on time frame (e.g. 20 min)
-- - Aggregate on altitude band (e.g. 200-1600m, 1600+ m)
-- - Average values

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
        avg(b.u_speed) AS avg_u_speed,
        avg(b.v_speed) AS avg_v_speed,
        avg(b.bird_density) AS avg_bird_density
    FROM
        bird_migration_altitude_profiles b
    LEFT JOIN
  		radars r
    ON
  		b.radar_id = r.cartodb_id
    WHERE
        b.radial_velocity_std >= 2
        AND b.bird_density >= 10
        AND b.altitude >= 0.2
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
