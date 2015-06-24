WITH conditional_data AS (
    SELECT
        radar_id,
        date_trunc('hour', start_time) + date_part('minute', start_time)::int / 20 * interval '20 min' AS interval_start_time,
        CASE
            WHEN altitude >= 0.2 AND altitude < 1.6 THEN 1
            WHEN altitude >= 1.6 THEN 2
        END AS altitude_band,
        u_speed,
        CASE
            WHEN radial_velocity_std >= 2 AND bird_density >= 1 THEN u_speed
            ELSE null
        END AS conditional_u_speed,
        v_speed,
        CASE
            WHEN radial_velocity_std >= 2 AND bird_density >= 1 THEN v_speed
            ELSE null
        END AS conditional_v_speed,
        CASE
            WHEN bird_density IS NULL THEN NULL
            WHEN radial_velocity_std >= 2 THEN bird_density
            ELSE 0
        END AS bird_density
    FROM
        lifewatch.bird_migration_altitude_profiles
    WHERE
        altitude >= 0.2
        AND altitude <= 4.0
)

SELECT
    radar_id,
    interval_start_time,
    altitude_band,
    CASE
        WHEN avg(conditional_u_speed) IS NOT NULL THEN round(avg(conditional_u_speed)::numeric,5)
        WHEN avg(u_speed) IS NOT NULL THEN 0
        ELSE null
    END AS avg_u_speed,
    CASE
        WHEN avg(conditional_v_speed) IS NOT NULL THEN round(avg(conditional_v_speed)::numeric,5)
        WHEN avg(v_speed) IS NOT NULL THEN 0
        ELSE null
    END AS avg_v_speed,
    round(avg(bird_density)::numeric,5) AS avg_bird_density,
    CASE
        WHEN altitude_band = 1 THEN round((avg(bird_density) * 7 /5)::numeric,5)
        WHEN altitude_band = 2 THEN round((avg(bird_density) * 7 /5)::numeric,5)
    END AS vertical_integrated_density,
    count(*) AS number_of_measurements
FROM conditional_data
GROUP BY
    radar_id,
    interval_start_time,
    altitude_band
ORDER BY
    interval_start_time,
    radar_id,
    altitude_band
