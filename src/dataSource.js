"use strict";

const { DBProvider } = require("./pg");
const fs = require("fs");
const { parse } = require("csv-parse");
const geoParse = require("wellknown");

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

const PRODUCT_TYPE_MAPPING = {
  orthophoto: "Orthophoto",
  orthphoto: "Orthophoto",
  orthophto: "Orthophoto",
  orthophotohistory: "OrthophotoHistory",
  orthophotobest: "OrthophotoBest",
  rastermap: "RasterMap",
  rastermapbest: "RasterMapBest",
  rasteraid: "RasterAid",
  rasteraidbest: "RasterAidBest",
  rastervector: "RasterVector",
  rastervectorbest: "RasterVectorBest",
};

class FileToDB {
  constructor(input) {
    this.columnMappedKeys = {};
    this.inputPath = input;
    this.dbClient;
    console.log("This is csv directory from user:", this.inputPath);
  }

  csvToPg = async () => {
    let linesCounter = 0;
    this.dbClient = new DBProvider();
    await this.constructCsvHeaders(); // load actual column header name and map it by indexes
    console.log(`--Loading CSV file to memory--`);
    return new Promise((resolve, reject) => {
      fs.createReadStream(this.inputPath)
        .pipe(parse({ delimiter: ",", from_line: 2 }))
        .on("error", reject)
        .on("data", async (row) => {
          linesCounter += 1;
          const isValidRow = this.validateData(row); // checking mandatory fields
          if (isValidRow) {
            const polygons = this.multiPolygon2Polygons(
              row[this.columnMappedKeys["wkt"]]
            );
            let polygonCounter = 0;
            for (const polygon of polygons) {
              polygonCounter += 1;
              console.log(
                `Processing line number ${linesCounter} -- polygon ${polygonCounter}/${polygons.length}`
              );
              const polygonParts = {
                recordId: row[this.columnMappedKeys["recordid"]],
                productId: row[this.columnMappedKeys["productid"]]
                  ? row[this.columnMappedKeys["productid"]]
                  : "unknown",
                productName: row[this.columnMappedKeys["productname"]]
                  ? row[this.columnMappedKeys["productname"]]
                  : "unknown",
                productVersion: "1.0",
                productType: PRODUCT_TYPE_MAPPING[row[this.columnMappedKeys["producttype"]].toLowerCase()],
                imageName: row[this.columnMappedKeys["imagename"]]
                  ? row[this.columnMappedKeys["imagename"]]
                  : undefined,
                //todo - start date taken from end
                sourceStartDateUtc: row[
                  this.columnMappedKeys["sourcedateend"]
                ].replaceAll("/", "-"),
                sourceEndDateUtc: row[
                  this.columnMappedKeys["sourcedateend"]
                ].replaceAll("/", "-"),
                //todo - min res taken from max
                minResolutionDegree: parseFloat(
                  row[this.columnMappedKeys["maxresolutiondeg"]]
                ),
                maxResolutionDegree: parseFloat(
                  row[this.columnMappedKeys["maxresolutiondeg"]]
                ),
                //todo - min res taken from max
                minResolutionMeter: parseFloat(
                  row[this.columnMappedKeys["maxresolutionmeter"]]
                ),
                maxResolutionMeter: parseFloat(
                  row[this.columnMappedKeys["maxresolutionmeter"]]
                ),
                minHorizontalAccuracyCe90: parseFloat(
                  row[this.columnMappedKeys["minhorizontalaccuracyce90"]]
                ),
                sensors: row[this.columnMappedKeys["sensors"]],
                region: row[this.columnMappedKeys["region"]]
                  ? row[this.columnMappedKeys["region"]]
                  : "unknown",
                classification:
                  CLASSIFICATION_MAPPING[
                    row[this.columnMappedKeys["classification"]].toLowerCase()
                  ],
                description: row[this.columnMappedKeys["description"]]
                  ? row[this.columnMappedKeys["description"]]
                  : "",
                geom: polygon,
              };
              console.log(
                `Insert to DB line number ${linesCounter} -- polygon ${polygonCounter}/${polygons.length}`
              );
              await this.dbClient.insertPolygonPart(polygonParts);
            }
          } else {
            console.error(
              `failed data validation for line ${linesCounter}, will skip this line`
            );
          }
        })
        .on("end", () => {
          resolve();
        });
    });
  };

  /**
 * Generate hashed object (columnMappedKeys) that map csv column to numeral value so the column order between csv files not important
 */
  constructCsvHeaders = async () => {
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

  validateData = (row) => {
    let isValid = true;

    if (
      !row[this.columnMappedKeys["classification"]] ||
      !CLASSIFICATION_MAPPING[
        row[this.columnMappedKeys["classification"]].toLowerCase()
      ]
    ) {
      isValid = false;
      console.error(
        `Failed validation for current row - not valid/supplied classification. classification should be: ${CLASSIFICATION_MAPPING.keys()}`
      );
    }

    if (
      !row[this.columnMappedKeys["producttype"]] ||
      !PRODUCT_TYPE_MAPPING[
        row[this.columnMappedKeys["producttype"]].toLowerCase()
      ]
    ) {
      isValid = false;
      console.error(
        `Failed validation for current row - not valid/supplied product type. productType should be: ${Object.values(
          PRODUCT_TYPE_MAPPING
        )}`
      );
    }

    if (!row[this.columnMappedKeys["recordid"]]) {
      isValid = false;
      this.printValidationError('recordId');
    }

    if (!row[this.columnMappedKeys["wkt"]]) {
      isValid = false;
      this.printValidationError('wkt');
    }

    if (!row[this.columnMappedKeys["sourcedateend"]]) {
      isValid = false;
      this.printValidationError('sourceDateEnd');
    }

    if (!row[this.columnMappedKeys["maxresolutiondeg"]]) {
      isValid = false;
      this.printValidationError('maxResolutionDeg');
    }

    if (!row[this.columnMappedKeys["maxresolutionmeter"]]) {
      isValid = false;
      this.printValidationError('maxResolutionMeter');
    }

    if (!row[this.columnMappedKeys["minhorizontalaccuracyce90"]]) {
      isValid = false;
      this.printValidationError('minHorizontalAccuracyCe90');
    }

    return isValid;
  };

  printValidationError = (type) => {
    console.error(
      `Failed validation for current row - ${type} not supplied, '${type}' is mandatory field`
    );
  };


  multiPolygon2Polygons = (wkt) => {
    const geoJson = geoParse(wkt);
    if (geoJson["type"] === "Polygon") return geoJson;

    const polygonsArray = geoJson["coordinates"].map((polygonCoordinates) => {
      return { type: "Polygon", coordinates: polygonCoordinates };
    });
    return polygonsArray;
  };
}



module.exports = {
  FileToDB,
};
