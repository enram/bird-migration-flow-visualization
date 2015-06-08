/**
 * Bird migration flow visualization for Belgium & the Netherlands
 *
 * https://github.com/enram/bird-migration-flow-visualization
 * Copyright (c) 2014 LifeWatch INBO
 * The MIT License - http://opensource.org/licenses/MIT
 *
 */

function fetchRadarData(url) {
    var result = jQuery.get(url, function(data) {
        jQuery('.result').html(data);
    });
    return result;
 }

/*
 * Retrieve data from our radars with altitude and start time as parameter
 * @param altitude a number to define which altitude band you need.  Currently 1 == low and 2 == high 
 */
function retrieveRadarDataByAltitudeAndTime(altitude, time) {
    var time_frame = "20 "; /* Time frames of 20 minutes */
    var sql = vsprintf("WITH aggregated_data AS ( SELECT b.radar_id, ST_X(r.the_geom) AS longitude, ST_Y(r.the_geom) AS latitude, date_trunc('hour', b.start_time) + date_part('minute', b.start_time)::int / %s * interval '%s min' AS interval_start_time, CASE WHEN b.altitude >= 0.2 AND b.altitude < 1.6 THEN 1 WHEN b.altitude >= 1.6 THEN 2 END AS altitude_band, count(*) AS number_of_measurements, CASE WHEN avg(b.radial_velocity_std) >= 2 AND avg(b.bird_density) >= 1 THEN avg(b.u_speed) ELSE 0 END AS avg_u_speed, CASE WHEN avg(b.radial_velocity_std) >= 2 AND avg(b.bird_density) >= 1 THEN avg(b.v_speed) ELSE 0 END AS avg_v_speed, CASE WHEN avg(b.radial_velocity_std) >= 2 AND avg(b.bird_density) >= 10 THEN avg(b.bird_density) ELSE 0 END AS avg_bird_density FROM bird_migration_altitude_profiles b LEFT JOIN radars r ON b.radar_id = r.radar_id WHERE b.altitude >= 0.2 GROUP BY b.radar_id, r.the_geom, interval_start_time, altitude_band ORDER BY b.radar_id, interval_start_time, altitude_band DESC ) SELECT * FROM aggregated_data WHERE altitude_band = %s AND interval_start_time = '%s'", [time_frame, time_frame, altitude, time]);
    var url = "http://lifewatch.cartodb.com/api/v2/sql?q=" + encodeURIComponent(sql);
    var result = fetchRadarData(url, "");
    return result;
}
