/**
 * birds - a project to visualize bird migration flow for Belgium & Netherlands.
 *
 * Copyright (c) 2014 LifeWatch - INBO
 * The MIT License - http://opensource.org/licenses/MIT
 *
 * https://github.com/enram/bird-migration-flow-visualization
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
 */
function retrieveRadarDataByAltitudeAndTime(altitude, time) {
	var time_frame = "20 "; /* Time frames of 20 minutes */
 	var sql = vsprintf("WITH aggregated_data AS ( SELECT radar_id, date_trunc('hour', start_time) + date_part('minute', start_time)::int / %s * interval '%s min' AS interval_start_time, CASE WHEN altitude >= 0.2 AND altitude < 1.6 THEN 'low' WHEN altitude >= 1.6 THEN 'high' END AS altitude_band, count(*) AS number_of_measurements, avg(u_speed) AS avg_u_speed, avg(v_speed) AS avg_v_speed, avg(bird_density) AS avg_bird_density FROM bird_migration_altitude_profiles WHERE radial_velocity_std >= 2 AND bird_density >= 10 AND altitude >= 0.2 GROUP BY radar_id, interval_start_time, altitude_band ORDER BY radar_id, interval_start_time, altitude_band DESC ) SELECT * FROM aggregated_data WHERE altitude_band = '%s' AND interval_start_time = '%s'", [time_frame, time_frame, altitude, time]);
 	var url = "https://lifewatch-inbo.cartodb.com/api/v2/sql?q=" + encodeURIComponent(sql);
 	console.log(url);
    var result = fetchRadarData(url, "");
    return result;
}