# polygon-parts-cli

This basic CLI inserts CSV data into PolygonParts DB using polygonPartsManger service and published a FeatureType to geoserver

## Prerequisites

1. Node.js
2. Suitable CSV data file as will be explained on next section - for single layer insertion with multiple parts

   **OR**

   Csv with a list of catalgIds for insertion on layers with single part.

3. Deployed polygonPartsManager, GeoserverApi,Geoserver, RasterCatalogManager

## Parts CSV structure

This csv is made manually by out PM.
This fields were defined by the `Sinergia System` to enable easy one time insert of already ingested layers.

|      Field       |            What is it             | Mandatory |       polygonParts Field Mapping       |
| :--------------: | :-------------------------------: | :-------: | :------------------------------------: |
|      Source      |        The sourceId value         |     +     |                sourceId                |
|    SourceName    |            source name            |     +     |               sourceName               |
|       WKT        | WKT of the layer. must be POLYGON |     +     |               footprint                |
|    UpdateDate    |    Date. In format DD/MM/YYYY     |     +     | imagingTimeBeginUTC, imagingTimeEndUTC |
|    SensorType    |          list of sensors          |     +     |                 OTHER                  |
|    Resolution    |         source resolution         |     +     |         sourceResolutionMeter          |
|       Ep90       |     part horizontal accuracy      |     +     |         horizontalAccuracyCE90         |
|    Countries     |         list of countries         |     +     |               countries                |
| ResolutionDegree |         used for min also         |     +     |            resolutionDegree            |
| ResolutionMeter  |        list of sensor name        |     +     |            resolutionMeter             |
|      Cities      |          list of cities           |     -     |                 cities                 |
|       Dsc        |            description            |     -     |              description               |

## Layer Ids CSV structure

|   Field   |     What is it      | Mandatory |     |
| :-------: | :-----------------: | :-------: | :-: |
| catalogId | The layer unique Id |     +     |

## Installation

Run the following command:

```
npm i
```

## Input Flags

| flag    | usage                                       | type    |
| ------- | ------------------------------------------- | ------- |
| -single | run insert on singlePart layers             | boolean |
| -multi  | run insert on one layer with multiple parts | boolean |
| -cId    | productId                                   | string  |

**Note**

when using both single/multi flag, remember to mount the file to the sample_data folder

## Config

Add and mount config file

```
{
  "partsFilePath": "../sample_data/example3.csv",
  "idsFilePath": "../sample_data/ids.csv",
  "calculateResolution": false,
  "rasterCatalogManagerUrl": "https://raster-catalog-manager-url",
  "geoserverApiUrl": "https://geoserver-api-url",
  "polygonPartsManagerUrl": "https://polygon-parts-manager-url"
}

```

calculateResolution - when doing multi insertion, wither to take resolutions from the csv or to calculate them from the source resolution

## Usage

Run the following command when running locally:

```
npm run start -- --multi true --cId 1a50a7f7-1d97-4299-bd32-6883484193cd
```

```
npm run start -- --single
```

Run the following command when running the docker locally :

--network=host is used when referring to a service that runs locally.

NODE_TLS_REJECT_UNAUTHORIZED=0 is used to reach services in openshift without certificates 

```
docker run -it -e NODE_TLS_REJECT_UNAUTHORIZED=0 -v ./config/config.json:/usr/src/config/config.json -v ./sample_data/ids.csv:/usr/src/sample_data/ids.csv  pp-cli:v2.0.1 --single

```

```
docker run -it -e NODE_TLS_REJECT_UNAUTHORIZED=0 -v ./config/config.json:/usr/src/config/config.json -v ./sample_data/example3.csv:/usr/src/sample_data/example3.csv  pp-cli:v2.0.1 --multi true --cId c52fe0f1-3f00-4088-a22b-debeee7866b5

```
