# France in maps

This webpage is an ongoing cartographic test. I want to map open data from data.gouv.fr. Ideally it would reproduce the same type of maps than in the excellent book "Le mystère français" from Hervé Le Bras and Emmanuel Todd and add interactivity by selecting datasets and available periods. 

## Details

I use shape files from [data.gouv.fr](https://www.data.gouv.fr/fr/datasets/decoupage-administratif-communal-francais-issu-d-openstreetmap/) (2015 version simplified at 100m). The problem with this file is that it weights 15.5 Mb so it's a long loading and that it isn't directly usable on github. I started by converting the .shp file into GeoJSON format using ogr2ogr from the Geospatial Data Abstraction Library ([GDAL](http://www.gdal.org/)).

	ogr2ogr -f GeoJSON -t_srs crs:84 geo.json communes-20150101-100m.shp

The GeoJSON file produced is even bigger (43.5 Mb), I then used [TopoJSON](https://github.com/topojson/topojson) to compress it and drastically reduce the file size (11 Mb!!) in order to minimize the loading time.

	geo2topo -o topo.json -q 1e5 geo.json

I then deleted the attributes that I didn't needed (wikipedia, surf_m2 and nom) and I added the geographic codes corresponding to each geometry with a Python script. This increases slightly the size of the file (11.6 Mb), I finally simplified the topology with TopoJSON-simplify to obtain a final size of 9.6Mb.
	
	toposimplify -o topo.json -p 1e-4 topo.json

Thanks to the geographic codes (and TopoJSON) we display different administrative levels ("communes" - "cantons" - "départements" - "régions") with the same data by merging geometries that have attributes in common.
