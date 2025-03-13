import fs from "fs";
import csvParser from "csv-parser";
import { LayerMetadata, PolygonPart } from "@map-colonies/mc-model-types";
import { CatalogIdRow, PolygonPartsPayload, ProductType } from "./interfaces";
import { RasterCatalogManagerClient } from "./rasterCatalogClient";
import { GeoserverApiClient } from "./geoserverApiClient";
import { PolygonPartsManagerClient } from "./polygonPartsClient";
import { MultiPolygon } from "geojson";

export class CSVToSinglePartHandler {
  private readonly filePath: string;
  private rasterCatalogManagerClient: RasterCatalogManagerClient;
  private geoserverApiClient: GeoserverApiClient;
  private polygonPartsManagerClient: PolygonPartsManagerClient;

  public constructor(
    filePath: string,
    rasterCatalogUrl: string,
    geoserverApiUrl: string,
    polygonPartsManagerUrl: string,
    wfsLink: string
  ) {
    this.filePath = filePath;
    this.rasterCatalogManagerClient = new RasterCatalogManagerClient(
      rasterCatalogUrl,wfsLink
    );
    this.geoserverApiClient = new GeoserverApiClient(geoserverApiUrl);
    this.polygonPartsManagerClient = new PolygonPartsManagerClient(
      polygonPartsManagerUrl,
    );
  }

  public async generateSinglePartInsertions(): Promise<void> {
    const catalogIdList = await this.parseCSV();
    for (const catalogId of catalogIdList) {
      try {
        //get from catalog layer info-handle all but 200
        const layerDetails =
          await this.rasterCatalogManagerClient.getLayer(catalogId);
        const { productId, productType } = layerDetails.metadata;
        const layerName = `${productId}-${productType}`;
        //check that layer is not published in geoserver
        const layerInGeoServer =
          await this.geoserverApiClient.findFeatureType(layerName);
        //if layer not in geoserver, build the request and post to polygonPartsManager and then publish the layer
        if (!layerInGeoServer) {
          console.log(
            `starting pp insert and publish of Layer: ${layerName} with catalogId: ${catalogId}`,
          );
          const request = this.createRequest(layerDetails.metadata, catalogId);
          await this.polygonPartsManagerClient.insert(request);
          const tableName = `${productId?.toLowerCase()}_${productType?.toLowerCase()}`;
          await this.geoserverApiClient.postFeatureType(layerName, tableName);
          await this.rasterCatalogManagerClient.updateLinks(layerDetails, catalogId);
          console.log(
            `finished successfully pp insert and publish of Layer: ${layerName} with catalogId: ${catalogId}`,
          );
        } else {
          console.log(
            `layer with id: ${catalogId} is already published in geoserver`,
          );
        }
      } catch (e) {
        console.error(
          `An Error occurred while processing layer with id: ${catalogId}`,
          e,
        );
      }
    }
    console.log(`finished iterating on all layers from the csv`);
  }

  private createRequest(
    metadata: LayerMetadata,
    catalogId: string,
  ): PolygonPartsPayload {
    let request: PolygonPartsPayload;
    if (metadata.footprint?.type === "Polygon") {
      request = {
        catalogId,
        productId: metadata.productId as string,
        productType: metadata.productType as ProductType,
        productVersion: metadata.productVersion as string,
        partsData: [
          {
            sourceId: metadata.productId,
            sourceName: metadata.productId,
            resolutionDegree: metadata.maxResolutionDeg,
            resolutionMeter: metadata.maxResolutionMeter,
            sourceResolutionMeter: metadata.maxResolutionMeter,
            horizontalAccuracyCE90: metadata.maxHorizontalAccuracyCE90,
            sensors: metadata.sensors as string[],
            imagingTimeBeginUTC: metadata.imagingTimeBeginUTC,
            imagingTimeEndUTC: metadata.imagingTimeEndUTC,
            footprint: metadata.footprint,
            description: metadata.description,
            countries: metadata.region,
          },
        ] as PolygonPart[],
      };
    } else if (metadata.footprint?.type === "MultiPolygon") {
      request = {
        catalogId,
        productId: metadata.productId as string,
        productType: metadata.productType as ProductType,
        productVersion: metadata.productVersion as string,
        partsData: this.createPartsData(metadata),
      };
    } else {
      throw new Error(
        `Layer with id : ${catalogId} is neither a Polygon nor a MultiPolygon.`,
      );
    }

    return request;
  }

  private createPartsData(metadata: LayerMetadata): PolygonPart[] {
    const multiPolygon = metadata.footprint as MultiPolygon;
    const partsData: PolygonPart[] = [];

    multiPolygon.coordinates.forEach((coordinates) => {
      const part = {
        sourceId: metadata.productId,
        sourceName: metadata.productId,
        resolutionDegree: metadata.maxResolutionDeg,
        resolutionMeter: metadata.maxResolutionMeter,
        sourceResolutionMeter: metadata.maxResolutionMeter,
        horizontalAccuracyCE90: metadata.maxHorizontalAccuracyCE90,
        sensors: metadata.sensors as string[],
        imagingTimeBeginUTC: metadata.imagingTimeBeginUTC,
        imagingTimeEndUTC: metadata.imagingTimeEndUTC,
        footprint: {
          type: "Polygon",
          coordinates,
        },
        description: metadata.description,
        countries: metadata.region,
      } as unknown as PolygonPart;

      partsData.push(part);
    });

    return partsData;
  }

  private async parseCSV(): Promise<string[]> {
    const inputFile = this.filePath;
    const catalogIds: string[] = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(inputFile)
        .pipe(csvParser())
        .on("data", (row: CatalogIdRow) => {
          try {
            catalogIds.push(row.catalogId);
          } catch (error) {
            console.error("Error processing row:", row, error);
          }
        })
        .on("end", () => resolve(catalogIds))
        .on("error", (error) => reject(error));
    });
  }
}
