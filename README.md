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
| sourceDateEnd | will be used also for "start" | + | YYYY-MM-DD hh:mm:ss|
| maxResolutionDeg | used for min also  | - | float |
| region | region / countries  | - |  |


## Installation
Run the following command:
```
npm i
```


## Usage
Run the following command:
```
npm run start:dev -i path/to/data.csv
```

or
```
npm run start -i path/to/data.csv
```