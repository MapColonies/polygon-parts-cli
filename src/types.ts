import type { Polygon } from 'geojson';
import { ALL_FIELDS } from './constants';

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

export type Field = typeof ALL_FIELDS[number];
export type FieldsRecord = Record<Field, number>;
export type PolygonRecord = Record<Field, string | number | Polygon | undefined>;

export type ProcessingSummary = {
    linesProcessed: number,
    polygonsProcessed: number,
};
