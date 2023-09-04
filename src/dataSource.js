"use strict";

const { DBProvider } = require("./pg");
const fs = require("fs");
const { parse } = require("csv-parse");
const geoParse = require('wellknown');


// each value is the original column name on "parts" table.
const MAP_TO_DB = {
  productid: "productId",
  recordsid: "recordId",
  classification: "classification",
  producttype: "productType",
  srsname: "srsName",
  description: "description",
  imagename: "imageName",
  minhorizontalaccuracyce90: "minHorizontalAccuracyCe90",
  maxresolutionmeter: "maxResolutionMeter",
  sensors: "sensors",
  productname: "productName",
  sourcedateend: "sourceEndDateUtc",
  maxresolutiondeg: "maxResolutionDegree",
  wkt: "WKT",
};

// each value is the original column name on "parts" table.
const CLASSIFICATION_MAPPING = {
  unclassified: 6,
  confidential: 5,
  secret: 4,
  topsecret: 3,
};

class FileToDB {
  constructor(input) {
    this.columnMappedKeys = {};
    this.inputPath = input;
    this.dbClient;
    console.log("this is csv directory from user:", this.inputPath);
  }

  csvToPg = async () => {
    let linesCounter = 0;
    this.dbClient = new DBProvider();
    await this.constructHeaders(); // load actual column header name and map it by indexes
    return new Promise((resolve, reject) => {
      fs.createReadStream(this.inputPath)
        .pipe(parse({ delimiter: ",", from_line: 2 }))
        .on("error", reject)
        .on("data", async (row) => {
          linesCounter+=1;
          if (row[this.columnMappedKeys['classification']] && CLASSIFICATION_MAPPING[row[this.columnMappedKeys['classification']].toLowerCase()]){
          const polygons = this.multiPolygon2Polygons(row[this.columnMappedKeys['wkt']])
          let polygonCounter = 0;
          for (const polygon of polygons){
              polygonCounter+=1;
              console.log(`Processing line number ${linesCounter} -- polygon ${polygonCounter}/${polygons.length}`)
                const polygonParts = {
                    recordId: row[this.columnMappedKeys['recordid']] ? row[this.columnMappedKeys['recordid']]: 'unknown',
                    productId: row[this.columnMappedKeys['productid']] ? row[this.columnMappedKeys['productid']]: 'unknown',
                    productName: row[this.columnMappedKeys['productname']] ? row[this.columnMappedKeys['productname']]: 'unknown',
                    productVersion: "1.0",
                    productType: row[this.columnMappedKeys['producttype']] ? row[this.columnMappedKeys['producttype']]: 'orthophotoBest',
                    imageName: row[this.columnMappedKeys['imagename']] ? row[this.columnMappedKeys['imagename']]: undefined,
                    sourceStartDateUtc: row[this.columnMappedKeys['sourcedateend']].replaceAll('/','-'),
                    sourceEndDateUtc: row[this.columnMappedKeys['sourcedateend']].replaceAll('/','-'),
                    minResolutionDegree: parseFloat(row[this.columnMappedKeys['maxresolutiondeg']]),
                    maxResolutionDegree: parseFloat(row[this.columnMappedKeys['maxresolutiondeg']]),
                    minResolutionMeter: parseFloat(row[this.columnMappedKeys['maxresolutionmeter']]),
                    maxResolutionMeter: parseFloat(row[this.columnMappedKeys['maxresolutionmeter']]),
                    minHorizontalAccuracyCe90: parseFloat(row[this.columnMappedKeys['minhorizontalaccuracyce90']]),
                    sensors: row[this.columnMappedKeys['sensors']],
                    region: row[this.columnMappedKeys['region']] ? row[this.columnMappedKeys['region']]: 'unknown',
                    classification: CLASSIFICATION_MAPPING[row[this.columnMappedKeys['classification']].toLowerCase()],
                    description: row[this.columnMappedKeys['description']] ? row[this.columnMappedKeys['description']]: '',
                    geom: polygon,
                }
                await this.dbClient.insertPolygonPart(polygonParts);
            }
          }
          else {
            console.error(`No classification provided for line ${linesCounter}, will skip this line`)
          }
        })
        .on("end", () => {
          resolve();
        });
    });
  };

  constructHeaders = async () => {
    return new Promise((resolve, reject) => {
      let enumerableHeaders = {};

      fs.createReadStream(this.inputPath)
        .pipe(parse({ delimiter: ",", to_line: 1 }))
        .on("error", reject)
        .on("data", (row) => {
          for (let i = 0; i < row.length; i++) {
            enumerableHeaders[row[i].toLowerCase()] = i;
          }
        })
        .on("end", () => {
          this.columnMappedKeys = { ...enumerableHeaders };
          resolve();
        });
    });
  };

  printObjects = () => {
    console.log(this.columnMappedKeys);
  };


  multiPolygon2Polygons = (wkt) => {
    const geoJson = geoParse(wkt);
    const polygonsArray = geoJson['coordinates'].map((polygonCoordinates) =>  { return {type: "Polygon", "coordinates": polygonCoordinates}});
    return polygonsArray;
  };
}


module.exports = {
  FileToDB,
};