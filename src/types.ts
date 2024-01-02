import type { GeoJSON, Polygon } from 'geojson';
import { ALL_FIELDS, OPTIONAL_FIELDS, REQUIRED_FIELDS } from './constants';

export type CSVConfig = {
    delimiter: string
};

export type PGConfig = {
    host: string,
    port: number,
    database: string,
    user: string,
    password: string,
    schema: string,
    table: string,
    insertGeometryAsWKT: boolean,
    insertPartStoredProcedure: string,
    updatePolygonPartsStoredProcedure: string,
    insertPartRecord: string,
    sslEnabled: boolean,
    rejectUnauthorized: boolean,
    sslPaths: {
        ca: string,
        key: string,
        cert: string
    },
    pool: {
        min: number,
        max: number
    }
};

export type RequiredField = typeof REQUIRED_FIELDS[number];
export type OptionalField = typeof OPTIONAL_FIELDS[number];
export type Field = typeof ALL_FIELDS[number];
type ReuiredFieldsRecord = Record<RequiredField, number>;
export type OptionalFieldsRecord = Record<OptionalField, number | undefined>;
export type FieldsMapping = ReuiredFieldsRecord & OptionalFieldsRecord;
export type PolygonRecordValues = string | number | Polygon | null;

type Part = {
    recordId: string,
    productType: string,
    srsName: string,
    maxResolutionMeter: number,
    maxResolutionDegree: number,
    sourceDateEndUTC: string,
    geom: Polygon | GeoJSON,
    minHorizontalAccuracyCE90: number,
    maxHorizontalAccuracyCE90: number,
    description: string,
    imageName: string,
    minResolutionMeter: number,
    minResolutionDegree: number,
    sourceDateStartUTC: string,
    region: string,
    productVersion: string,
    productId: string,
    classification: string,
    sensors: string,
    productName: string,
};

export type RequiredPartField = {
    [key in RequiredField]: Part[key];
};
export type OptionalPartField = {
    [key in OptionalField]: Part[key] | null;
};
export type PartRecord = RequiredPartField & OptionalPartField;

export type ProcessingSummary = {
    rowsProcessed: number,
    polygonsProcessed: number,
};

export type RowValue<T, K> = T extends Array<infer U> ? U : K;
export type ExtractItem<T, K, L> = K extends undefined ? null : RowValue<T, L>;
