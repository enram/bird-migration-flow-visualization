-- Aggregate bird_migration_altitude_profile data:
-- - Aggregate on time frame (e.g. 20 min)
-- - Aggregate on altitude band (e.g. 200-1600m, 1600+ m)
-- - Average values

SELECT
  radar_id,
  date_trunc('hour', start_time) + date_part('minute', start_time)::int / 20 * interval '20 min' AS interval_start_time,
  CASE
    WHEN altitude >= 0.2 AND altitude < 1.6 THEN 'low'
    WHEN altitude >= 1.6 THEN 'high'
  END AS altitude_band,
  count(*) AS number_of_measurements,
  avg(u_speed) AS avg_u_speed,
  avg(v_speed) AS avg_v_speed,
  avg(bird_density) AS avg_bird_density
FROM
  bird_migration_altitude_profiles
WHERE
  radial_velocity_std >= 2
  AND bird_density >= 10
  AND altitude >= 0.2
GROUP BY
  radar_id,
  interval_start_time,
  altitude_band
ORDER BY
  radar_id,
  interval_start_time,
  altitude_band DESC
