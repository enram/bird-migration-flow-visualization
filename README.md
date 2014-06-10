# Bird migration flow visualization

## Rationale

Weather radars can detect bird migration, but visualizing these data in an easy to understand manner is challenging. Inspired by [air](http://air.nullschool.net) - a [open source](https://github.com/cambecc/air) flow visualization of wind in Tokyo, created by [Cameron Beccario](https://twitter.com/cambecc) - we wondered if we could do the same for bird migration data.

## Result

<http://enram.github.io/bird-migration-flow-visualization/viz/>

[![screenshot](screenshot.png)](http://enram.github.io/bird-migration-flow-visualization/viz/)

We created this visualization during a 5 day hackathon on June 2 to 6, 2014, hosted at the [University of Amsterdam](http://ibed.uva.nl/research/research-groups/research-groups/research-groups/content/folder/computational-geo-ecology/computational-geo-ecology.html) in collaboration with [KNMI](http://www.knmi.nl/). It was created for the [European Network for the Radar Surveillance of Animal Movement (ENRAM)](http://enram.eu) and funded by [COST](http://cost.eu/) as a short term scientific mission ([mission report](documentation/stsm-report.md)).

## Data

* [Case study bird migration altitude profiles](https://github.com/enram/case-study/tree/master/data/bird-migration-altitude-profiles) retrieved from weather radars.
* [Radar locations](https://github.com/enram/case-study/blob/master/data/radars/radars.geojson)
* [Basemap for Belgium and the Netherlands as topojson](data/basemap)

## How it works

1. The geospatial functions of [D3.js](http://d3js.org/) are used to draw an svg basemap from a [topojson](data/basemap/basemap.topojson) file.
2. [Bird migration altitude profiles](https://lifewatch-inbo.cartodb.com/tables/bird_migration_altitude_profiles/public) and [radar locations](https://lifewatch-inbo.cartodb.com/tables/radars/public) data are hosted on CartoDB.
3. Bird migration data are aggregated on time interval (20 minutes) and altitude band (200-1600m, above 1600m), averaging `u_speed` and `v_speed` of the general movement for each radar/altitude/interval, with a threshold (see [SQL](documentation/aggregate-data.sql)).
4. Data are retrieved via the [CartoDB API](http://developers.cartodb.com/documentation/apis-overview.html).
5. A grid with interpolated `u_speed` and `v_speed` is generated based on the data from the 5 radars using inverse distance weighting.
6. Particles are released in the grid with a randomized position and age.
7. When the animation is in play modus, the interpolation grid is periodically recalculated based on data from a new time interval. New and existing particles use the new grid to navigate.

*Step 5 and 6 use altered code from [air](https://github.com/cambecc/air).*

## Contributors

Developed by [LifeWatch INBO](http://lifewatch.inbo.be):

* [Peter Desmet](https://twitter.com/peterdesmet)
* [Bart Aelterman](https://twitter.com/bartaelterman)
* [Kevin Azijn](https://twitter.com/kazijn)

Data and guidance provided by:

* Judy Shamoun-Baranes (UvA)
* [Hans van Gasteren](https://twitter.com/hvangasteren) (RNLAF)
* Hidde Leijnse (KNMI)
* Willem Bouten (UvA)

## License

The MIT License ([LICENSE](LICENSE))
