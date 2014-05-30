# Basemap

## Find and select source data

### Countries

Source: `ne_10m_admin_0_countries` from http://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/

Selection (in CartoDB):

```SQL
SELECT * 
FROM ne_10m_admin_0_countries
WHERE
  iso_a2 = 'BE'
  OR iso_a2 = 'NL'
```

Result: [ne_10m_admin_0_countries.geojson](ne_10m_admin_0_countries.geojson)

### Populated places

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

## Combine source data as a topojson

From [this tutorial](http://bost.ocks.org/mike/map/#converting-data):

```
topojson -o basemap.topojson --id-property geonameid --properties name=name -- ne_10m_populated_places_simple.geojson ne_10m_admin_0_countries.geojson
```

Result: [basemap.topojson](basemap.topojson)
