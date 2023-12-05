import type { Polygon } from 'geojson';
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
    storedProcedure: string,
    insertPolygonPartRecord: string,
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
export type ReuiredFieldsRecord = Record<RequiredField, number>;
export type OptionalFieldsRecord = Record<OptionalField, number | undefined>;
export type FieldsRecord = ReuiredFieldsRecord & OptionalFieldsRecord;
export type PolygonRecordValues = string | number | Polygon | null;
// export type PolygonRecord = Record<Field, PolygonRecordValues>;
type PolygonPart = {
    recordId: string,
    productType: string,
    srsName: string,
    maxResolutionMeter: number,
    maxResolutionDeg: number,
    sourceDateEnd: string,
    geom: Polygon,
    minHorizontalAccuracyCE90: number,
    maxHorizontalAccuracyCE90: number,
    description: string,
    imageName: string,
    minResolutionMeter: number,
    minResolutionDeg: number,
    sourceDateStart: string,
    region: string,
    productVersion: string,
    productId: string,
    classification: string,
    sensors: string,
    productName: string,
};
export type PolygonPartRecord = {
    [key in RequiredField]: PolygonPart[key];
} & {
    [key in OptionalField]: PolygonPart[key] | null;
}

export type ProcessingSummary = {
    rowsProcessed: number,
    polygonsProcessed: number,
};
