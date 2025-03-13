import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { promises as fs } from "fs";
import { CSVToMultiplePartsHandler } from "./csvToMultiPartsHandler";
import { CSVToSinglePartHandler } from "./csvToSinglePartHandler";
import path from "path";

const argv = yargs(hideBin(process.argv))
  .usage("insert request to polygon parts service")
  .option("single", {
    alias: "single",
    describe: "insert a list of singlePart layers",
    type: "boolean",
  })
  .option("multi", {
    alias: "multi",
    describe: "insert a singleLayer with multipleParts",
    type: "boolean",
  })
  .option("cId", {
    alias: "catalogId",
    describe: "layer catalogId for a single insert with multiple parts",
    type: "string",
  })
  .conflicts("single", ["multi", "cId"]) // Prevents using --single with --multi or --cId
  .help(true)
  .parseSync();

console.log(argv);

// Example usage
(async () => {
  try {
    // Load the config file
    const configPath = path.resolve(__dirname, "../config/config.json");
    const configData = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(configData);

    // Extract config variables
    const {
      partsFilePath,
      idsFilePath,
      calculateResolution,
      rasterCatalogManagerUrl,
      geoserverApiUrl,
      polygonPartsManagerUrl,
      wfsLink
    } = config;
    if (argv.single) {
      console.log("Generating inserts on single parts layers");
      const singlePartHandler = new CSVToSinglePartHandler(
        idsFilePath,
        rasterCatalogManagerUrl,
        geoserverApiUrl,
        polygonPartsManagerUrl,
        wfsLink
      );
      await singlePartHandler.generateSinglePartInsertions();
      console.log("Done successfully");
    } else if (argv.multi && argv.cId) {
      const catalogId = argv.cId;
      console.log(
        `Generating insert on layer: ${catalogId} with calcRes set to: ${calculateResolution}`,
      );
      const multiplePartsHandler = new CSVToMultiplePartsHandler(
        partsFilePath,
        catalogId,
        calculateResolution,
        rasterCatalogManagerUrl,
        geoserverApiUrl,
        polygonPartsManagerUrl,
        wfsLink
      );
      await multiplePartsHandler.generateMultiPartsInsertion();
      console.log("Done successfully");
    }
  } catch (error) {
    throw error;
  }
})();
