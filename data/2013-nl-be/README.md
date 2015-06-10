# Data for the 2013 Netherlands/Belgium case study

## Introduction

The case study is documented in [this repository](https://github.com/enram/case-study).

## Data

* Radar positions: [radars.json](radars.json)
* Aggregated bird data: [birds.csv](birds.csv)
* Basemap: [basemap.topojson](basemap.topojson)

## Procedure for aggregating bird data

### Source

* [Bird migration altitude profiles](https://github.com/enram/case-study/tree/master/data/bird-migration-altitude-profiles)

### Conditions

* Only use measurements between 0.2 and 4.0km (both inclusive). This results in 19 altitudes, from 0.3 to 3.9km.
* For u speed/v speed:
    * Only consider speed if the radial velocity standard deviation is above 2 (to make sure we are only considering *birds*) and the bird density is above 1 birds/km<sup>3</sup> (for more precise *bird* speed).
    * Set speed to `null` if those conditions are not met. Original `null` values will remain `null`.
    * Since we check for the same conditions, either both u speed and v speed will meet the requirements or none.
* For bird density:
    * Only consider bird density if the radial velocity standard deviation is above 2 (to make sure we are only considering *birds*).
    * Set bird density to 0 if those conditions are not met.
    * Keep original `null` values as `null`.

### Aggregation

* Aggregate in two altitude bands:
    * 0.2 to 1.6km. This aggregates 7 altitudes, from 0.3 to 1.5.
    * 1.6 to 4.0km. This aggregates 12 altitudes, from 1.7 to 3.9.
* Aggregate per 20 minutes. This typically combines 4 different date/times.
* For u speed/v speed:
    * Average the speeds, if at least one of the altitudes within the altitude band has a speed which met the conditions.
    * Set the speed to 0 if none of the altitudes within the altitude band has a speed which met the conditions, but there were originaly speeds detected.
    * Keep `null` if no speeds were detected.
* For bird density (birds/km<sup>3</sup>):
    * Average the bird density (0 values will affect this, which is ok).
* For vertical integrated density (birds/km<sup>2</sup>):
    * For the lower altitude band, multiply the average bird density by the number of altitudes (7) and divide by 5 (to get to 1km instead of 200m).
    * For the higher altitude band, multiply the average bird density by the number of altitudes (12) and divide by 5 (to get to 1km instead of 200m).
    * Note: `null` values will affect this "sum", which is not good, but we haven't found such values in the data yet.

### SQL

PostgreSQL on CartoDB:

```SQL
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
```

## Procedure for creating basemap

### Source data

* Countries: [ne_10m_admin_0_countries](shapefiles/ne_10m_admin_0_countries/), downloaded from [Natural Earth Data](http://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/)
* Lakes: [ne_10m_lakes](shapefiles/ne_10m_lakes/), downloaded from [Natural Earth Data](http://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-lakes/)

Selection (in CartoDB):

```SQL
SELECT * 
FROM ne_10m_admin_0_countries
WHERE
  iso_a2 = 'BE'
  OR iso_a2 = 'NL'
```

Result: [ne_10m_admin_0_countries.geojson](ne_10m_admin_0_countries.geojson)

### Populated places data (not displayed)

Source: `ne_10m_populated_places_simple` from http://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/

Selection (in CartoDB):

```SQL
SELECT * 
FROM ne_10m_populated_places_simple
WHERE
    (iso_a2 = 'BE'
    OR iso_a2 = 'NL')
    AND scalerank < 8
```

Result: [ne_10m_populated_places_simple.geojson](ne_10m_populated_places_simple.geojson)

### Combine source data as a topojson

From [this tutorial](http://bost.ocks.org/mike/map/#converting-data):

```
topojson -o basemap.topojson --id-property geonameid --properties name=name --bbox -- ne_10m_populated_places_simple.geojson ne_10m_admin_0_countries.geojson ../../../case-study/data/radars/radars.geojson
```

Note: this assumes you have also cloned the [case-study repository](https://github.com/enram/case-study).