# polygon-parts-cli
This basic CLI inserts CSV data into PolygonParts DB


## Prerequisites
1. Node.js 
2. Suitable CSV data file as will be explained on next section
3. PostGIS instance with a suited DB schema


## CSV structure
| Field | What is it    | Mandatory   | possible values\examples |
| :---:   | :---: | :---: | :---: |
| geom | WKT geometry of feature, may be `MULTIPOLYGON` or `POLYGON`   | +  | |
| recordId | Catalog ID of original layer   | +   | will be UUID |
| productId | Name of Parts source   | -   | |
| classification | Level of classification provided   | +   | Unclassified, Confidential, Secret, TopSecret | 
| productType | discrete type   | +   | Orthophoto, OrthophotoHistory, OrthophotoBest, RasterMap, RasterMapBest, RasterAid, RasterAidBest, RasterVector, RasterVectorBest| 
| srsName | On default `GCS_WGS_1984`   | - <br/> (Not in use)   | GCS_WGS_1984 |
| description | free text of information   | - |  |
| imageName | original image name   | - |  |
| minHorizontalAccuracyCE90 |   | - | float |
| maxResolutionMeter | used for min also  | - | float |
| sensors | list of sensor name  | - | OGEN_CHAD, WORLDVIEW2|
| productName | internal name of material | - | |
| productVersion | product version of the polygon part | - | |
| sourceDateEndUTC | will be used also for "start" | + | YYYY-MM-DD hh:mm:ss|
| maxResolutionDegree | used for min also  | - | float |
| region | region / countries  | - |  |


## Installation
Run the following command:
```
npm i
```

## Configuration
Set up the following config variables to define DB connection:  
`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_SCHEMA`, `DB_TABLE`, `DB_SSL_ENABLED`, `DB_REJECT_UNAUTHORIZED`, `DB_SSL_CA`, `DB_SSL_KEY`, `DB_SSL_CERT`

Set for geometry field insertion type support:  
`DB_INSERT_GEOMETRY_AS_WKT`

Set polygon parts DB resources options:  
`DB_INSERT_PART_STORED_PROCEDURE`,`DB_UPDATE_POLYGON_PARTS_STORED_PROCEDURE`,`DB_INSERT_PART_RECORD`

Set up pool configuration options:  
`DB_POOL_MIN`, `DB_POOL_MAX`

Set CSV parsing options:  
`CSV_DELIMITER`


Alternatively, if in development mode you can set up the configurations in the relevant file in the config folder


## Usage
Run the following command:
```
npm run start:dev -i path/to/data.csv
```

or
```
npm run start -i path/to/data.csv
```