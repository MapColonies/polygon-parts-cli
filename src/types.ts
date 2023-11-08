import { VALIDATION_ERRORS, ALL_FIELDS } from './constants';

export type PGConfig = {
    host: string,
    port: number,
    database: string,
    user: string,
    password: string,
    schema: string,
    table: string,
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

export type DataSource = typeof ALL_FIELDS[number];
export type DataSourceRecord = Record<DataSource, number>;

export type QQQ = keyof typeof VALIDATION_ERRORS;

export type ProcessingSummary = {
    linesProcessed: number,
    polygonsProcessed: number,
};
