# polygon-parts-cli

This basic CLI inserts CSV data into PolygonParts DB using polygonPartsManger service

## Prerequisites

1. Node.js
2. Suitable CSV data file as will be explained on next section
3. Deployed polygonPartsManager
   UpdateDate,SensorType,Resolution,Ep90,Dsc,Countries,ResolutionDegree,ResolutionMeter,Cities

## CSV structure

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

## Installation

Run the following command:

```
npm i
```

## Input Flags

| flag | value                           |
| ---- | ------------------------------- |
| -s   | polygonPartsManager service url |
| -i   | csv file name                   |
| -p   | productId                       |
| -c   | catalogId                       |
| -v   | productVersion                  |
| -t   | productType                     |

**Note** productType must be one of: 'Orthophoto',
'OrthophotoHistory',
'OrthophotoBest',
'RasterMap',
'RasterMapBest',
'RasterAid',
'RasterAidBest',
'RasterVector',
'RasterVectorBest',

## Usage

Run the following command when running locally:

```
npm run start -- -s polygonPartsServiceUrl-i path/to/data.csv -p productID -c catalogId -v productVersion -t productType
```

Run the following command when running the docker locally :

--network=host is used when reffering to a polygonPartManager service that runs locally.

```
docker run --network=host --rm -v /path/to/csv/file/locally:/usr/src/app/sample_data docker_image:docker_tag -s=http://localhost:8081 -i ./sample_data/israel.csv -p some_product_id -c some_catalog_id -v version -t product_type
```
