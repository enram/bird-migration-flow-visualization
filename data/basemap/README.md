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
