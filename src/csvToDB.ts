import { wktToGeoJSON } from '@terraformer/wkt';
import config from 'config';
import { parse } from 'csv';
import { createReadStream } from 'fs';
import type { GeoJSON, Polygon } from 'geojson';
import { DatabaseError } from 'pg';
import { ALL_FIELDS, REQUIRED_FIELDS, SUPPORTED_GEO_TYPES, VALIDATION_ERRORS } from './constants';
import { CSVValidationError, DBError } from './error';
import { DBProvider } from './pg';
import type { CSVConfig, FieldsRecord, PolygonRecord, ProcessingSummary } from './types';

export class CSVToDB {
  dbProvider: DBProvider;
  csvConfig: CSVConfig;

  constructor(private readonly inputPath: string) {
    this.dbProvider = new DBProvider(); // TODO: inject
    this.csvConfig = config.get<CSVConfig>('csv');
  }

  public async csvToPg(): Promise<ProcessingSummary> {
    console.log('Processing file headers');
    const mappedKeys = await this.mapColumnsToKeys(); // load actual column header name and map it by indexes
    if (!this.validateHeaders(mappedKeys)) throw new Error('Headers validation error');

    console.log('Processing file content');
    return this.processContent(mappedKeys);
  }

  private async processContent(mappedKeys: FieldsRecord): Promise<ProcessingSummary> {
    const dbClient = await this.dbProvider.connectToDb();
    let lineNumber = 0, totalPolygonCounter = 0;

    return new Promise<ProcessingSummary>(async (resolve, reject) => {
      try {
        const readStream = createReadStream(this.inputPath)
          .pipe(parse({
            delimiter: this.csvConfig.delimiter,
            from_line: 2,
          }));

        let row: string[];
        for await (row of readStream) {
          lineNumber += 1;

          this.validateContent(row, mappedKeys, lineNumber);
          const polygons = this.getPolygons(row[mappedKeys.geom], lineNumber);

          let polygonCounter = 0;
          for (const polygon of polygons) {
            polygonCounter += 1;
            console.log(`Processing line number ${lineNumber} -- polygon ${polygonCounter} out of ${polygons.length}`);
            const polygonRecord = this.processRow(row, mappedKeys, polygon);

            try {
              await this.dbProvider.insertPolygon(polygonRecord, dbClient);
            } catch (err) {
              if (err instanceof DatabaseError)
                throw new DBError(err.message, lineNumber);
            }
            totalPolygonCounter += 1;
          }
        }
        await this.dbProvider.commit(dbClient);
        resolve({
          linesProcessed: lineNumber,
          polygonsProcessed: totalPolygonCounter
        });
      } catch (err) {
        await this.dbProvider.rollback(dbClient);
        reject(err);
      } finally {
        dbClient.release();
        await this.dbProvider.end();
      }
    });
  }

  private processRow(row: string[], mappedKeys: FieldsRecord, polygon: Polygon) {
    const polygonRecord: PolygonRecord = {
      recordId: row[mappedKeys.recordId],
      productId: row[mappedKeys.productId],
      productName: row[mappedKeys.productName],
      productVersion: row[mappedKeys.productVersion],
      sourceDateStart: row[mappedKeys.sourceDateEnd],
      sourceDateEnd: row[mappedKeys.sourceDateEnd],
      minResolutionDeg: parseFloat(row[mappedKeys.maxResolutionDeg]),
      maxResolutionDeg: parseFloat(row[mappedKeys.maxResolutionDeg]),
      minResolutionMeter: parseFloat(row[mappedKeys.maxResolutionMeter]),
      maxResolutionMeter: parseFloat(row[mappedKeys.maxResolutionMeter]),
      minHorizontalAccuracyCE90: parseFloat(row[mappedKeys.minHorizontalAccuracyCE90]),
      maxHorizontalAccuracyCE90: parseFloat(row[mappedKeys.minHorizontalAccuracyCE90]),
      sensors: row[mappedKeys.sensors],
      region: row[mappedKeys.region],
      classification: row[mappedKeys.classification],
      description: row[mappedKeys.description],
      geom: polygon,
      imageName: row[mappedKeys.imageName],
      productType: row[mappedKeys.productType],
      srsName: row[mappedKeys.srsName],
    };
    return polygonRecord;
  }

  // maps CSV columns to numeral values so the column order is not important
  private async mapColumnsToKeys(): Promise<Record<PropertyKey, number>> {
    return new Promise((resolve, reject) => {
      let headers: Record<PropertyKey, number> = {};

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
            headers[key] = i;
          }
        })
        .on('end', () => {
          resolve(headers);
        });
    });
  }

  private validateHeaders(headers: Record<PropertyKey, number>): headers is FieldsRecord {
    const keys = Object.keys(headers);

    const missingHeaders = REQUIRED_FIELDS.filter(requiredField => !keys.includes(requiredField));
    if (missingHeaders.length > 0) throw new Error(`Failed validation of headers -- missing headers: ${missingHeaders}`);

    const unsupportedHeaders = keys.filter(key => !(ALL_FIELDS as unknown as string[]).includes(key));
    if (unsupportedHeaders.length > 0) throw new Error(`Failed validation of headers -- unsupported headers: ${unsupportedHeaders}`);

    return true;
  }

  private validateContent(row: string[], mappedKeys: FieldsRecord, lineNumber: number): void {
    for (const field of REQUIRED_FIELDS) {
      if (!row[mappedKeys[field]])
        throw new CSVValidationError(field, VALIDATION_ERRORS.mandatoryField, lineNumber, undefined);
    }

    const wkt = row[mappedKeys.geom];
    const geoType = wkt.split(/[ \(]/, 1)[0];
    if (!SUPPORTED_GEO_TYPES.includes(geoType))
      throw new CSVValidationError('geom', VALIDATION_ERRORS.geometryType, lineNumber, undefined);
  }

  private getPolygons(wkt: string, lineNumber: number): Polygon[] {
    let geoJson: GeoJSON;
    try {
      geoJson = wktToGeoJSON(wkt);
    }
    catch (err) {
      throw new Error(`Failed to parse geometry in line ${lineNumber}`);
    }

    switch (geoJson.type) {
      case 'Polygon':
        return [geoJson];
      case 'MultiPolygon':
        return geoJson.coordinates.map<Polygon>(polygonCoordinates => {
          return { type: 'Polygon', coordinates: polygonCoordinates };
        });
      default:
        throw new Error('Only MULTIPOLYGON and POLYGON geometry types are supported');
    }
  }
}
