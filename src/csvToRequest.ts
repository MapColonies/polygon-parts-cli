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

type ZoomLevelResult = { resolutionDegree: number; resolutionMeter: number };

export class CSVToRequest {
  private readonly filePath: string;
  private readonly catalogId: string;
  private readonly productId: string;
  private readonly productType: string;
  private readonly productVersion: string;
  private readonly calcRes: boolean;

  public constructor(
    filePath: string,
    catalogId: string,
    productId: string,
    productType: string,
    productVersion: string,
    calcRes: boolean,
  ) {
    this.filePath = filePath;
    this.catalogId = catalogId;
    this.productId = productId;
    this.productType = productType;
    this.productVersion = productVersion;
    this.calcRes = calcRes;
  }

  public async createRequest(): Promise<PolygonPartsPayload> {
    const transformedData = await this.parseCSV();
    const request: PolygonPartsPayload = {
      catalogId: this.catalogId,
      productId: this.productId,
      productType: this.productType as ProductType,
      productVersion: this.productVersion,
      partsData: transformedData,
    };
    return request;
  }

  private async parseCSV(): Promise<PolygonPart[]> {
    const inputFile = this.filePath;
    const results: PolygonPart[] = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(inputFile)
        .pipe(csvParser())
        .on("data", (row: CSVRow) => {
          try {
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
            console.error("Error processing row:", row, error);
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
}
