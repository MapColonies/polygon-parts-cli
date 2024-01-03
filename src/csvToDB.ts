import { wktToGeoJSON } from '@terraformer/wkt';
import booleanIntersects from '@turf/boolean-intersects';
import flatten from '@turf/flatten';
import union from '@turf/union';
import config from 'config';
import { parse } from 'csv';
import { createReadStream } from 'fs';
import type { Feature, GeoJSON, GeoJsonProperties, MultiPolygon, Polygon } from 'geojson';
import { DatabaseError } from 'pg';
import { ALL_FIELDS, OPTIONAL_FIELDS, REQUIRED_FIELDS, SUPPORTED_GEO_TYPES, VALIDATION_ERRORS } from './constants';
import { CSVContentValidationError, CSVHeaderValidationError, DBError } from './error';
import type { DBProvider } from './pg';
import type { CSVConfig, FieldsMapping, PartRecord, ProcessingSummary } from './types';
import { getValue, isInArray } from './utilities';

export class CSVToDB {
  csvConfig: CSVConfig;

  constructor(private readonly inputPath: string, private readonly dbProvider: DBProvider) {
    this.csvConfig = config.get<CSVConfig>('csv');
  }

  public async csvToPg(): Promise<ProcessingSummary> {
    console.log('Processing file headers');
    const mappedKeys = await this.mapColumnsToKeys(); // load actual column header name and map it by indexes
    if (!this.validateHeaders(mappedKeys)) throw new Error('Headers validation error');

    console.log('Processing file content');
    return this.processContent(mappedKeys);
  }

  private async processContent(mappedKeys: FieldsMapping): Promise<ProcessingSummary> {
    const dbClient = await this.dbProvider.connectToDb();
    let rowNumber = 0, totalPolygonCounter = 0;

    return new Promise<ProcessingSummary>(async (resolve, reject) => {
      try {
        const readStream = createReadStream(this.inputPath)
          .pipe(parse({
            delimiter: this.csvConfig.delimiter,
            from_line: 2,
          }));

        let row: string[];
        for await (row of readStream) {
          rowNumber += 1;

          this.validateContent(row, mappedKeys, rowNumber);
          const polygons = this.getPolygons(getValue(row, mappedKeys.geom), rowNumber);

          let polygonCounter = 0;
          for (const polygon of polygons) {
            polygonCounter += 1;
            console.log(`Processing row number ${rowNumber} -- polygon ${polygonCounter} out of ${polygons.length}`);
            const polygonRecord = this.processRow(row, mappedKeys, polygon);

            try {
              await this.dbProvider.insertPart(polygonRecord, dbClient);
            } catch (err) {
              if (err instanceof DatabaseError)
                throw new DBError(err.message, rowNumber);
              throw new Error('Could not insert the polygon');
            }
            totalPolygonCounter += 1;
          }
        }

        // TODO: perhaps refactor
        console.log('Calculating polygon parts, this might take a while for large inserts 🤌');
        await this.dbProvider.updatePolygonParts(dbClient);
        console.log('Finished calculating polygon parts 💯');

        await this.dbProvider.commit(dbClient);
        resolve({
          rowsProcessed: rowNumber,
          polygonsProcessed: totalPolygonCounter
        });
      } catch (err) {
        try {
          await this.dbProvider.rollback(dbClient);
          console.log('Rollbacked changes successfully');
        } catch (err) {
          if (err instanceof DatabaseError)
            throw new DBError(err.message, rowNumber);
          throw new Error('Could not rollback the transaction');
        } finally {
          reject(err);
        }
      } finally {
        dbClient.release();
        await this.dbProvider.end();
      }
    });
  }

  private processRow(row: string[], mappedKeys: FieldsMapping, polygon: Polygon) {
    const minHorizontalAccuracyCE90 = getValue(row, mappedKeys.minHorizontalAccuracyCE90);
    const maxHorizontalAccuracyCE90 = getValue(row, mappedKeys.maxHorizontalAccuracyCE90 ?? mappedKeys.minHorizontalAccuracyCE90);

    const polygonPartRecord: PartRecord = {
      recordId: getValue(row, mappedKeys.recordId),
      productId: getValue(row, mappedKeys.productId),
      productName: getValue(row, mappedKeys.productName),
      productVersion: getValue(row, mappedKeys.productVersion),
      sourceDateStartUTC: getValue(row, mappedKeys.sourceDateStartUTC ?? mappedKeys.sourceDateEndUTC),
      sourceDateEndUTC: getValue(row, mappedKeys.sourceDateEndUTC),
      minResolutionDegree: parseFloat(getValue(row, mappedKeys.minResolutionDegree ?? mappedKeys.maxResolutionDegree)),
      maxResolutionDegree: parseFloat(getValue(row, mappedKeys.maxResolutionDegree)),
      minResolutionMeter: parseFloat(getValue(row, mappedKeys.minResolutionMeter ?? mappedKeys.maxResolutionMeter)),
      maxResolutionMeter: parseFloat(getValue(row, mappedKeys.maxResolutionMeter)),
      minHorizontalAccuracyCE90: minHorizontalAccuracyCE90 === null ? minHorizontalAccuracyCE90 : parseFloat(minHorizontalAccuracyCE90),
      maxHorizontalAccuracyCE90: maxHorizontalAccuracyCE90 === null ? maxHorizontalAccuracyCE90 : parseFloat(maxHorizontalAccuracyCE90),
      sensors: getValue(row, mappedKeys.sensors),
      region: getValue(row, mappedKeys.region),
      classification: getValue(row, mappedKeys.classification),
      description: getValue(row, mappedKeys.description),
      geom: polygon,
      imageName: getValue(row, mappedKeys.imageName),
      productType: getValue(row, mappedKeys.productType),
      srsName: getValue(row, mappedKeys.srsName),
    };

    // replace empty string values with nulls for optional fields
    Object.entries(polygonPartRecord).forEach(([key, value]) => {
      if (isInArray(key, OPTIONAL_FIELDS) && value === '') polygonPartRecord[key] = null
    });

    return polygonPartRecord;
  }

  // maps CSV columns to numeral values so the column order is not important
  private async mapColumnsToKeys(): Promise<Partial<FieldsMapping>> {
    return new Promise((resolve, reject) => {
      let headers: Partial<FieldsMapping> = {};

      // TODO: refactor like above
      createReadStream(this.inputPath)
        .pipe(parse({
          delimiter: this.csvConfig.delimiter,
          to_line: 1
        }))
        .on('error', reject)
        .on('data', (row: string[]) => {
          for (let i = 0; i < row.length; i++) {
            const key = row[i];
            if (isInArray(key, ALL_FIELDS)) {
              headers[key] = i;
            }
            else throw new CSVHeaderValidationError(key, VALIDATION_ERRORS.unsupportedHeader);
          }
        })
        .on('end', () => {
          resolve(headers);
        });
    });
  }

  private validateHeaders(headers: Partial<FieldsMapping>): headers is FieldsMapping {
    const keys = Object.keys(headers);

    const missingHeaders = REQUIRED_FIELDS.filter(requiredField => !keys.includes(requiredField));
    if (missingHeaders.length > 0) throw new Error(`Failed validation of headers -- missing headers: ${missingHeaders}`);

    return true;
  }

  private validateContent(row: string[], mappedKeys: FieldsMapping, rowNumber: number): void {
    for (const field of REQUIRED_FIELDS) {
      if (!row[mappedKeys[field]])
        throw new CSVContentValidationError(field, VALIDATION_ERRORS.mandatoryField, rowNumber, undefined);
    }

    const wkt = row[mappedKeys.geom];
    const geoType = wkt.split(/[ \(]/, 1)[0];
    if (!SUPPORTED_GEO_TYPES.includes(geoType))
      throw new CSVContentValidationError('geom', VALIDATION_ERRORS.geometryType, rowNumber, undefined);
  }

  private mergeOverlappingMultiParts(polygons: Polygon[]): Polygon[] {
    const uniqueOverlappingPartsIndices = new Set<number>();

    for (let i = 0; i < polygons.length; i++) {
      for (let j = i + 1; j < polygons.length; j++) {
        if (booleanIntersects(polygons[i], polygons[j])) {
          uniqueOverlappingPartsIndices.add(i);
          uniqueOverlappingPartsIndices.add(j);
        }
      }
    }

    const overlappingPartsIndices = Array.from(uniqueOverlappingPartsIndices);
    if (overlappingPartsIndices.length === 0) return polygons;

    let overlappingParts: Feature<Polygon | MultiPolygon, GeoJsonProperties> = {
      type: 'Feature',
      geometry: polygons[overlappingPartsIndices[0]],
      properties: {}
    };

    for (let i = 1; i < overlappingPartsIndices.length - 1; i++) {
      overlappingParts = union(overlappingParts, polygons[overlappingPartsIndices[i]]) ?? overlappingParts;
    }

    const overlappingPolygonParts = flatten(overlappingParts).features.map((feature) => feature.geometry);
    const nonOverlappingPolygonParts = polygons.filter((_, overlappingPartIndex) => !overlappingPartsIndices.includes(overlappingPartIndex));

    return [
      ...overlappingPolygonParts,
      ...nonOverlappingPolygonParts
    ];
  }

  private getPolygons(wkt: string, rowNumber: number): Polygon[] {
    let geoJson: GeoJSON;
    try {
      geoJson = wktToGeoJSON(wkt);
    }
    catch (err) {
      throw new Error(`Failed to parse geometry at row ${rowNumber}`);
    }

    switch (geoJson.type) {
      case 'Polygon':
        return [geoJson];
      case 'MultiPolygon':
        const polygonParts = geoJson.coordinates.map<Polygon>(polygonCoordinates => {
          return { type: 'Polygon', coordinates: polygonCoordinates };
        });
        return this.mergeOverlappingMultiParts(polygonParts);
      default:
        throw new Error('Only MULTIPOLYGON and POLYGON geometry types are supported');
    }
  }
}
