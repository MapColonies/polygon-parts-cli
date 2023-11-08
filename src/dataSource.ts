import { parse } from 'csv';
import { createReadStream } from 'fs';
import { GeoJSONPolygon, parse as geoParse } from 'wellknown';
import { CLASSIFICATION_MAPPING, PRODUCT_TYPE_MAPPING, SUPPORTED_GEO_TYPES, allFields, requiredFields } from './constants';
import { DBProvider } from './pg';
import { DataSource, DataSourceRecord, ProcessingSummary } from './types';
import { hasDefinedProps, isInArray, isPartOf } from './utilities';

export class FileToDB {
  dbProvider: DBProvider;

  constructor(private readonly inputPath: string) {
    this.dbProvider = new DBProvider(); // TODO: inject
  }

  public csvToPg = async (): Promise<ProcessingSummary> => {
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
          let polygons: GeoJSONPolygon[];

          this.validateData(row, columnMappedKeys); // checking mandatory fields
          // TODO: Add validation all mandatory fields exist
          polygons = this.multiPolygonToPolygons(row[columnMappedKeys.geom]);

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

  private processRow = (row: string[], columnMappedKeys: DataSourceRecord, polygon: GeoJSONPolygon) => {
    const classificationKey = row[columnMappedKeys.classification].toLowerCase();
    const productTypeKey = row[columnMappedKeys.productType].toLowerCase();
    const polygonRecord: Record<DataSource, string | number | GeoJSONPolygon | undefined> = {
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
  private constructCsvHeaders = async (): Promise<DataSourceRecord> => {
    return new Promise((resolve, reject) => {
      let enumerableHeaders: Partial<DataSourceRecord> = {};

      createReadStream(this.inputPath)
        .pipe(parse({ delimiter: ',', to_line: 1 }))
        .on('error', reject)
        .on('data', (row: string[]) => {
          for (let i = 0; i < row.length; i++) {
            const key = row[i];
            if (!isInArray(key, allFields)) continue;
            enumerableHeaders[key] = i;
          }
        })
        .on('end', () => {
          hasDefinedProps(enumerableHeaders, ...requiredFields) ? resolve(enumerableHeaders) : reject();
        });
    });
  };

  private validateData = (row: string[], columnMappedKeys: DataSourceRecord) => {
    const classificationKey = row[columnMappedKeys.classification];
    if (
      !classificationKey ||
      !isPartOf(classificationKey.toLowerCase(), CLASSIFICATION_MAPPING)
    )
      throw new Error(`Failed validation for current row - invalid classification. classification should be one of: ${Object.keys(CLASSIFICATION_MAPPING)}`);

    const productTypeKey = row[columnMappedKeys.productType];
    if (
      !row[columnMappedKeys.productType] ||
      !isPartOf(productTypeKey.toLowerCase(), PRODUCT_TYPE_MAPPING)
    )
      throw new Error(`Failed validation for current row - invalid product type. productType should be one of: ${Object.values(PRODUCT_TYPE_MAPPING)}`);

    if (!row[columnMappedKeys.recordId])
      throw new Error(this.formatError('recordId'));

    if (!row[columnMappedKeys.geom]) {
      throw new Error(this.formatError('geom'));
    } else {
      const wkt = row[columnMappedKeys.geom];
      const geoType = wkt.split(' ')[0];
      if (!SUPPORTED_GEO_TYPES.includes(geoType))
        throw new Error(`geom field should consist of Polygon or MultiPolygon WKT geometry types, provided geom: '${geoType}'`);
    }

    if (!row[columnMappedKeys.sourceEndDateUtc])
      throw new Error(this.formatError('sourceDateEnd'));

    if (!row[columnMappedKeys.maxResolutionDegree])
      throw new Error(this.formatError('maxResolutionDegree'));

    if (!row[columnMappedKeys.maxResolutionMeter])
      throw new Error(this.formatError('maxResolutionMeter'));

    if (!row[columnMappedKeys.minHorizontalAccuracyCe90])
      throw new Error(this.formatError('minHorizontalAccuracyCe90'));
  };

  private formatError = (type: string): string => {
    return `Failed validation for current row - '${type}' is a mandatory field`;
  };

  private multiPolygonToPolygons = (wkt: string): GeoJSONPolygon[] => {
    const geoJson = geoParse(wkt);
    if (!geoJson) throw new Error('Failed to parse geometry');
    if (geoJson.type !== 'MultiPolygon' && geoJson.type !== 'Polygon') throw new Error('Only MultiPolygon and Polygon geometry types are supported');
    if (geoJson.type === 'Polygon') return [geoJson];

    const polygons: GeoJSONPolygon[] = geoJson.coordinates.map((polygonCoordinates) => {
      return { type: 'Polygon', coordinates: polygonCoordinates };
    });
    return polygons;
  };
}
