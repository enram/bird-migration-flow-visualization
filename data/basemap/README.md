# Basemap

## Countries

Source: `ne_50m_admin_0_countries` from http://www.naturalearthdata.com/downloads/50m-cultural-vectors/

Selection (in CartoDB):

```SQL
SELECT * 
FROM ne_50m_admin_0_countries
WHERE
  iso_a2 = 'BE'
  OR iso_a2 = 'NL'
```

## Populated places

Source: `ne_10m_populated_places_simple` from http://www.naturalearthdata.com/downloads/10m-cultural-vectors/

```SQL
SELECT * 
FROM ne_10m_populated_places_simple
WHERE
	(iso_a2 = 'BE'
	OR iso_a2 = 'NL')
	AND scalerank < 8
```
