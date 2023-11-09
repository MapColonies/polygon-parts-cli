import { wktToGeoJSON } from '@terraformer/wkt';
import { parse } from 'csv';
import { createReadStream } from 'fs';
import type { Polygon } from 'geojson';
import { ALL_FIELDS, CLASSIFICATION_MAPPING, PRODUCT_TYPE_MAPPING, REQUIRED_FIELDS, SUPPORTED_GEO_TYPES, VALIDATION_ERRORS } from './constants';
import { CSVValidationError } from './error';
import { DBProvider } from './pg';
import type { DataSourceRecord, PolygonRecord, ProcessingSummary } from './types';
import { hasProps, isInArray, isPartOf } from './utilities';

export class FileToDB {
  dbProvider: DBProvider;

  constructor(private readonly inputPath: string) {
    this.dbProvider = new DBProvider(); // TODO: inject
  }

  public async csvToPg(): Promise<ProcessingSummary> {
    const dbClient = await this.dbProvider.connectToDb();
    let linesCounter = 0, totalPolygonCounter = 0;

    console.log('Processing file headers');
    const columnMappedKeys = await this.constructCsvHeaders(); // load actual column header name and map it by indexes

    console.log('Processing file content');
    return new Promise<ProcessingSummary>(async (resolve, reject) => {
      try {
        const readStream = createReadStream(this.inputPath)
          .pipe(parse({
            delimiter: ',',
            from_line: 2,
          }));

        let row: string[];
        for await (row of readStream) {
          linesCounter += 1;

          this.validateData(row, columnMappedKeys, linesCounter); // checking mandatory fields
          // TODO: Add validation all mandatory fields exist
          const polygons = this.multiPolygonToPolygons(row[columnMappedKeys.geom]);

          let polygonCounter = 0;
          for (const polygon of polygons) {
            polygonCounter += 1;
            console.log(`Processing line number ${linesCounter} -- polygon ${polygonCounter} out of ${polygons.length}`);
            const polygonRecord = this.processRow(row, columnMappedKeys, polygon);

            const rowsInserted = await this.dbProvider.insertPolygon(polygonRecord, dbClient);
            totalPolygonCounter += rowsInserted;
          }
        }
        this.dbProvider.commit(dbClient);
        resolve({
          linesProcessed: linesCounter,
          polygonsProcessed: totalPolygonCounter
        });
      } catch (err) {
        this.dbProvider.rollback(dbClient);
        reject(err);
      } finally {
        dbClient.release();
        await this.dbProvider.end();
      }
    });
  }

  private processRow(row: string[], columnMappedKeys: DataSourceRecord, polygon: Polygon) {
    const classificationKey = row[columnMappedKeys.classification].toLowerCase();
    const productTypeKey = row[columnMappedKeys.productType].toLowerCase();
    const polygonRecord: PolygonRecord = {
      recordId: row[columnMappedKeys.recordId],
      productId: row[columnMappedKeys.productId] ?? 'unknown',
      productName: row[columnMappedKeys.productName] ?? 'unknown',
      productVersion: row[columnMappedKeys.productVersion],
      productType: isPartOf(productTypeKey, PRODUCT_TYPE_MAPPING) ? PRODUCT_TYPE_MAPPING[productTypeKey] : undefined,
      imageName: row[columnMappedKeys.imageName],
      //TODO - start date taken from end
      sourceStartDateUtc: row[columnMappedKeys.sourceEndDateUtc],
      sourceEndDateUtc: row[columnMappedKeys.sourceEndDateUtc],
      //TODO - min res taken from max
      minResolutionDegree: parseFloat(row[columnMappedKeys.maxResolutionDegree]),
      maxResolutionDegree: parseFloat(row[columnMappedKeys.maxResolutionDegree]),
      //TODO - min res taken from max
      minResolutionMeter: parseFloat(row[columnMappedKeys.maxResolutionMeter]),
      maxResolutionMeter: parseFloat(row[columnMappedKeys.maxResolutionMeter]),
      minHorizontalAccuracyCe90: parseFloat(row[columnMappedKeys.minHorizontalAccuracyCe90]),
      sensors: row[columnMappedKeys.sensors],
      region: row[columnMappedKeys.region] ?? 'unknown',
      classification: isPartOf(classificationKey, CLASSIFICATION_MAPPING) ? CLASSIFICATION_MAPPING[classificationKey] : undefined,
      description: row[columnMappedKeys.description] ?? '',
      geom: polygon,
      srsName: row[columnMappedKeys.srsName],
    };
    return polygonRecord;
  }

  /**
   * Generate hashed object (columnMappedKeys) that map CSV column to numeral value so the column order between csv files not important
   */
  private async constructCsvHeaders(): Promise<DataSourceRecord> {
    return new Promise((resolve, reject) => {
      let enumerableHeaders: Partial<DataSourceRecord> = {};

      // TODO: refactor like above
      createReadStream(this.inputPath)
        .pipe(parse({ delimiter: ',', to_line: 1 }))
        .on('error', reject)
        .on('data', (row: string[]) => {
          for (let i = 0; i < row.length; i++) {
            const key = row[i];
            if (!isInArray(key, ALL_FIELDS)) continue;
            enumerableHeaders[key] = i;
          }
        })
        .on('end', () => {
          hasProps(enumerableHeaders, ...REQUIRED_FIELDS) ? resolve(enumerableHeaders) : reject();
        });
    });
  };

  private validateHeaders() {

  }

  private validateData(row: string[], columnMappedKeys: DataSourceRecord, linesCounter: number) {
    for (const field of REQUIRED_FIELDS) {
      if (!row[columnMappedKeys[field]])
        throw new CSVValidationError(field, linesCounter, VALIDATION_ERRORS.mandatoryField);
    }

    if (!isPartOf(row[columnMappedKeys.classification].toLowerCase(), CLASSIFICATION_MAPPING))
      throw new CSVValidationError('classification', linesCounter, VALIDATION_ERRORS.domainValues, ` ${Object.keys(CLASSIFICATION_MAPPING)}`);

    if (!isPartOf(row[columnMappedKeys.productType].toLowerCase(), PRODUCT_TYPE_MAPPING))
      throw new CSVValidationError('productType', linesCounter, VALIDATION_ERRORS.domainValues, ` ${Object.values(PRODUCT_TYPE_MAPPING)}`);

    const wkt = row[columnMappedKeys.geom];
    const geoType = wkt.split(/[ \(]/, 1)[0];
    if (!SUPPORTED_GEO_TYPES.includes(geoType))
      throw new CSVValidationError('geom', linesCounter, VALIDATION_ERRORS.geometryType);
  };

  private multiPolygonToPolygons(wkt: string): Polygon[] {
    const geoJson = wktToGeoJSON(wkt);
    switch (geoJson.type) {
      case 'Polygon':
        return [geoJson];
      case 'MultiPolygon':
        return geoJson.coordinates.map<Polygon>((polygonCoordinates) => {
          return { type: 'Polygon', coordinates: polygonCoordinates };
        })
      default:
        throw new Error('Only MULTIPOLYGON and POLYGON geometry types are supported');
    }
  };
}
