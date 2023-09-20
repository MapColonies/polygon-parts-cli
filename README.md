# polygon-parts-cli
This basic CLI insert static csv data into PolygonParts DB


## Prerequisites
1. Node.js 
2. Suitable csv data file as will be explained on next section

<br/> 

## CSV structure
| Field | What is it    | Mandatory   | possible values\examples |
| :---:   | :---: | :---: | :---: |
| WKT | geometry of feature, may be MultiPolygon or Polygon   | +  | |
| recordId | Catalog ID of original layer   | +   | will be UUID |
| productId | Name of Parts source   | -   | |
| classification | Level of classification provided   | +   | unclassified(6), confidential(5), secret(4), topSecret(3) | 
| productType | discrete type   | +   | Orthophoto, OrthophotoHistory, OrthophotoBest, RasterMap, RasterMapBest, RasterAid, RasterAidBest, RasterVector, RasterVectorBest| 
| srsName | On default epsg:4326   | - <br/> (Not in use)   | GCS_WGS_1984 |
| description | free text of information   | - |  |
| imageName | original image name   | - |  |
| minHorizontalAccuracyCE90 |   | - | number |
| maxResolutionMeter | used for min also  | - | float |
| sensors | list of sensor name  | - | OGEN_CHAD, WORLDVIEW2|
| productName | internal name of material | - | |
| sourceDateEnd | will be used also for "start" | + | dd/mm/yyyy hh:mm:ss|
| maxResolutionDeg | used for min also  | - | float |

<br/> 

## Installation
Run the following command:
```
npm i
```

<br/> 


## Usage
Run the following command:
```
node src/index.js -i path/to/data.csv
```
