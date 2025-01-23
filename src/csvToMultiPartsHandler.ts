import fs from "fs";
import wkx from "wkx";
import csvParser from "csv-parser";
import { PolygonPart } from "@map-colonies/mc-model-types";
import { Polygon } from "geojson";
import { CSVRow, PolygonPartsPayload, ProductType } from "./interfaces";
import {
  zoomToResolutionDegMapper,
  zoomToResolutionMeterMapper,
} from "./constants";
import { RasterCatalogManagerClient } from "./rasterCatalogClient";
import { GeoserverApiClient } from "./geoserverApiClient";
import { PolygonPartsManagerClient } from "./polygonPartsClient";

type ZoomLevelResult = { resolutionDegree: number; resolutionMeter: number };

export class CSVToMultiplePartsHandler {
  private readonly filePath: string;
  private readonly catalogId: string;
  private readonly calcRes: boolean;
  private rasterCatalogManagerClient: RasterCatalogManagerClient;
  private geoserverApiClient: GeoserverApiClient;
  private polygonPartsManagerClient: PolygonPartsManagerClient;

  public constructor(
    filePath: string,
    catalogId: string,
    calcRes: boolean,
    rasterCatalogUrl: string,
    geoserverApiUrl: string,
    polygonPartsManagerUrl: string,
    wfsLink: string
  ) {
    this.filePath = filePath;
    this.catalogId = catalogId;
    this.calcRes = calcRes;
    this.rasterCatalogManagerClient = new RasterCatalogManagerClient(
      rasterCatalogUrl,wfsLink
    );
    this.geoserverApiClient = new GeoserverApiClient(geoserverApiUrl);
    this.polygonPartsManagerClient = new PolygonPartsManagerClient(
      polygonPartsManagerUrl,
    );
  }

  public async generateMultiPartsInsertion(): Promise<void> {
    try {
      //findLayer and get Details
      const layerDetails = await this.rasterCatalogManagerClient.getLayer(
        this.catalogId,
      );
      const { productId, productType } = layerDetails.metadata;
      const layerName = `${productId}-${productType}`;
      //check that layer is not published in geoserver
      const layerInGeoServer =
        await this.geoserverApiClient.findFeatureType(layerName);
      //check that layer not it geoserver
      //if layer not in geoserver, build the request and post to polygonPartsManager and then publish the layer
      if (!layerInGeoServer) {
        console.log(
          `starting pp insert and publish of Layer: ${layerName} with catalogId: ${this.catalogId}`,
        );
        const transformedData = await this.parseCSV();
        const request: PolygonPartsPayload = {
          catalogId: this.catalogId,
          productId: productId as string,
          productType: productType as ProductType,
          productVersion: layerDetails.metadata.productVersion as string,
          partsData: transformedData,
        };
        await this.polygonPartsManagerClient.insert(request);
        const tableName = `${productId?.toLowerCase()}_${productType?.toLowerCase()}`;
        await this.geoserverApiClient.postFeatureType(layerName, tableName);
        await this.rasterCatalogManagerClient.updateLinks(layerDetails, this.catalogId);
        console.log(
          `finished successfully pp insert and publish of Layer: ${layerName} with catalogId: ${this.catalogId}`,
        );
      } else {
        console.log(
          `layer with id: ${this.catalogId} is already published in geoserver`,
        );
      }
    } catch (e) {
      throw e;
    }
  }

  private async parseCSV(): Promise<PolygonPart[]> {
    const inputFile = this.filePath;
    const results: PolygonPart[] = [];

    return new Promise((resolve, reject) => {
      let rowNumber = 0;
      fs.createReadStream(inputFile)
        .pipe(csvParser())
        .on("data", (row: CSVRow) => {
          rowNumber++;
          try {
            this.validateRow(row);
            let resolutionDegree: number;
            let resolutionMeter: number;

            if (this.calcRes) {
              const resolutions = this.findZoomLevelAndResolution(
                +row.Resolution,
              );
              resolutionDegree = resolutions.resolutionDegree;
              resolutionMeter = resolutions.resolutionMeter;
            } else {
              resolutionDegree = +row.ResolutionDegree;
              resolutionMeter = +row.ResolutionMeter;
            }
            results.push({
              sourceId: row.Source,
              sourceName: row.SourceName,
              resolutionDegree: resolutionDegree,
              resolutionMeter: resolutionMeter,
              sourceResolutionMeter: +row.Resolution,
              horizontalAccuracyCE90: +row.Ep90,
              sensors: row.SensorType.split(",").map((sensor) => sensor.trim()),
              imagingTimeBeginUTC: new Date(row.UpdateDate),
              imagingTimeEndUTC: new Date(row.UpdateDate),
              footprint: wkx.Geometry.parse(row.WKT).toGeoJSON() as Polygon,
              description: row.Dsc,
              countries: row.Countries.split(",").map((country) =>
                country.trim(),
              ),
              cities: row.Cities.split(",").map((city) => city.trim()),
            });
          } catch (error) {
            const err = error as Error;
            throw new Error(
              `Error on row ${rowNumber}: ${err.message} in row: ${JSON.stringify(row)}`,
            );
          }
        })
        .on("end", () => resolve(results))
        .on("error", (error) => reject(error));
    });
  }

  private findZoomLevelAndResolution(resolution: number): ZoomLevelResult {
    for (let zoomLevel = 22; zoomLevel >= 0; zoomLevel--) {
      if (zoomToResolutionMeterMapper[zoomLevel] >= resolution) {
        const resolutionMeter = zoomToResolutionMeterMapper[zoomLevel];
        const resolutionDegree = zoomToResolutionDegMapper[zoomLevel];
        return { resolutionDegree, resolutionMeter };
      }
    }
    throw Error(`Cant find ${resolution} in ResolutionMeterBuffer`);
  }

  private validateRow(row: CSVRow): void {
    if (!row.UpdateDate || isNaN(new Date(row.UpdateDate).getTime())) {
      throw new Error(
        `Invalid UpdateDate. Must be a valid date. : ${row.UpdateDate}`,
      );
    }
    // Check if WKT is a valid polygon
    if (!/^POLYGON\s*\(\(.*\)\)$/.test(row.WKT)) {
      throw new Error(`Invalid WKT format. Expected a POLYGON.`);
    }
    if (!row.Resolution || isNaN(+row.Resolution)) {
      throw new Error("Invalid Resolution. Must be a number.");
    }

    if (!row.Countries || row.Countries.trim() === "") {
      throw new Error("Countries field is required.");
    }

    if (!row.SensorType || row.SensorType.trim() === "") {
      throw new Error("SensorType field is required.");
    }
  }
}
