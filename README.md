# Bird migration flow visualization

## Rationale

Weather radars can detect bird migration, but visualizing these data in an intuitive way is challenging. Inspired by and based upon "[air](http://air.nullschool.net)" - an open source flow visualization of wind and air pollutants in Tokyo by [Cameron Beccario](https://twitter.com/cambecc) - we created an interactive, online flow visualization of bird migration.

## Result

<http://enram.github.io/bird-migration-flow-visualization/viz/>

This visualization is a web application written in HTML, CSS and JS, showing bird migration as an animated flow, superimposed on a map and progressing through time. Controls at the top of the visualization allow the user to start and stop this progression, manually navigate through time intervals, select a specific date and time, as well as toggle between two altitude bands. The main difference with "[air](https://github.com/cambecc/air)" is the functionality to progress and navigate through time. The visualization has been applied on two case studies: [Netherlands and Belgium](http://enram.github.io/bird-migration-flow-visualization/viz/2/nl-be/index.html) and [Northeastern United States](http://enram.github.io/bird-migration-flow-visualization/viz/2/ne-us/index.html), but it can support other case studies as well (see "Installation"). For more information, see Shamoun-Baranes et al. 2016 (in press).

[![screenshot](screenshot.png)](http://enram.github.io/bird-migration-flow-visualization/viz/)

## Installation to add your own case study

1. Clone this repo
2. Start a HTTP server (e.g. using `Python -m http.server 8000`)
3. Go to `viz/2` and duplicate the directory `nl-be` as `my-study`
4. Provide a basemap as a topojson file ([example](viz/2/nl-be/basemap.topojson))
5. Provide radar locations as a geojson file ([example](viz/2/nl-be/radars.json))
6. Provide aggregated bird migration altitude profiles as a csv file ([example](viz/2/nl-be/birds.csv))
7. Reference these files and set some settings in the variable `settings` at the bottom of `index.html`
8. Go to `http://localhost:8000/viz/2/my-study` to see your case study visualized.

## Contributors

Developed by [LifeWatch INBO](http://lifewatch.inbo.be):

* [Peter Desmet](https://twitter.com/peterdesmet)
* [Bart Aelterman](https://twitter.com/bartaelterman)
* [Kevin Azijn](https://twitter.com/kazijn)

Guidance provided by:

* Judy Shamoun-Baranes (UvA)
* [Hans van Gasteren](https://twitter.com/hvangasteren) (UvA)
* Hidde Leijnse (KNMI)
* Willem Bouten (UvA)

## Thanks

This visualization was mainly created over the course of two hackathons (June 2014 and June 2015) hosted by the [University of Amsterdam](http://ibed.uva.nl/research/research-groups/research-groups/research-groups/content/folder/computational-geo-ecology/computational-geo-ecology.html) and funded as [short term scientific missions](http://www.enram.eu/stsm/) by [COST](http://cost.eu/) for the [European Network for the Radar Surveillance of Animal Movement (ENRAM)](http://enram.eu).

## License

The MIT License ([LICENSE](LICENSE))
