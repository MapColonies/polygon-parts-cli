import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { PolygonPartsManagerClient } from "./polygonPartsClient";
import { CSVToRequest } from "./csvToRequest";

const argv = yargs(hideBin(process.argv))
  .usage("insert request to polygon parts service")
  .option("s", {
    alias: "polygon_parts_service",
    describe: "polygon_parts_service",
    type: "string",
  })
  .option("i", {
    alias: "input",
    describe: "input file (csv)",
    type: "string",
  })
  .option("i", {
    alias: "input",
    describe: "input file (csv)",
    type: "string",
  })
  .option("p", {
    alias: "product_id",
    describe: "product_id",
    type: "string",
  })
  .option("c", {
    //uuid
    alias: "catalog_id",
    describe: "catalog_id",
    type: "string",
  })
  .option("t", {
    // add closed options list
    alias: "product_type",
    describe: "product_type",
    type: "string",
  })
  .option("v", {
    alias: "product_version",
    describe: "product version",
    type: "string",
  })
  .help(true)
  .parseSync();

console.log(argv);

// Example usage
(async () => {
  try {
    if (argv.i && argv.p && argv.c && argv.t && argv.v && argv.s) {
      const filePath = argv.i;
      const productId = argv.p;
      const catalogId = argv.c;
      const productType = argv.t;
      const productVersion = argv.v;
      const polygonPartsServiceUrl = argv.s;
      const polygonPartsManager = new PolygonPartsManagerClient(
        polygonPartsServiceUrl,
      );
      const CSVToRequestParser = new CSVToRequest(
        filePath,
        catalogId,
        productId,
        productType,
        productVersion,
      );
      const request = await CSVToRequestParser.createRequest();
      await polygonPartsManager.insert(request);
      ///console.log(JSON.stringify(transformedData, null, 2));
    }
  } catch (error) {
    console.error("Error inserting to polygonPartsManager:", error);
  }
})();
