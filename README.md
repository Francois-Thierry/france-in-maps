# France in maps

Cette page est un test de cartographie des données de l'INSEE. Idéalement elle devrait permettre de produire le même type de carte que celles de l'excellent livre "Le mystère français" de Hervé Le Bras et Emmanuel Todd et ajouter de l'interactivité en choisissant parmi les données et les périodes disponibles.

## Details

J'utilise des fichiers formes provenant de <a href="https://www.data.gouv.fr/fr/datasets/decoupage-administratif-communal-francais-issu-d-openstreetmap/" target="_blank">data.gouv.fr</a> (version 2015 simplifiée à 100m). J'ai ensuite convertit le fichier .shp en GeoJSON en utilisant ogr2ogr de la <a href="http://www.gdal.org/" target="_blank">librairie d'abstraction de données géospatiales (GDAL)</a>. 

    ogr2ogr -f GeoJSON -t_srs crs:84 geo.json communes-20150101-100m.shp</i>

Puis en TopoJSON pour réduire la taille du fichier (-60%!) et ainsi accélérer le chargement.

    geo2topo -o topo.json -q 1e6 geo.json

J'ai ensuite encore réduit la taille du fichier (-27%) en retirant les attributs dont je n'avais pas besoin. J'ai ainsi retiré les attributs x_chf_lieu, y_chf_lieu, wikipedia, statut, population, lat_centro et lon_centro à l'aide d'un script Python.

J'ai ensuite enrichi le fichier avec les propriétés géographiques d'appartenance à un canton, departement et région (et nouvelle région 2015) de chaque commune grâce à un script Python (vous pouvez trouver la version Javascript commentée dans le fichier source).

Ces attributs (et TopoJSON) permettent d'afficher différents niveaux de résolutions (communes - cantons - départements - régions - régions nouvelles) avec les mêmes données en fusionnant les géométries qui ont des attributs en commun.

## Notes

It might be possible to remove the commune surface property and get it through GeoJSON (see [link](http://bl.ocks.org/pnavarrc/14ed098d4072be2715db)).