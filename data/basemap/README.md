# Basemap

## Find and select source data

### Countries

Source: `ne_50m_admin_0_countries` from http://www.naturalearthdata.com/downloads/50m-cultural-vectors/

Selection (in CartoDB):

```SQL
SELECT * 
FROM ne_50m_admin_0_countries
WHERE
  iso_a2 = 'BE'
  OR iso_a2 = 'NL'
```

Result: [ne_50m_admin_0_countries_be_nl.geojson](ne_50m_admin_0_countries_be_nl.geojson)

### Populated places

Source: `ne_10m_populated_places_simple` from http://www.naturalearthdata.com/downloads/10m-cultural-vectors/

Selection (in CartoDB):

```SQL
SELECT * 
FROM ne_10m_populated_places_simple
WHERE
	(iso_a2 = 'BE'
	OR iso_a2 = 'NL')
	AND scalerank < 8
```

Result: [ne_10m_populated_places_simple_be_nl.geojson](ne_10m_populated_places_simple_be_nl.geojson)

## Combine source data as a topojson

From [this tutorial](http://bost.ocks.org/mike/map/#converting-data):

```
topojson -o basemap.json --id-property geonameid --properties name=name -- ne_10m_populated_places_simple_be_nl.geojson ne_50m_admin_0_countries_be_nl.geojson
```
